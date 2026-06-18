/**
 * ═══════════════════════════════════════════════════════════════════
 *  RULang v2.0 — Roman Urdu Retro Programming Language
 *  script.js — Complete Compiler / Interpreter Pipeline
 *
 *  NEW in v2.0:
 *    • agar / warna agar / warna / khatam  → if / else-if / else / end
 *    • chunao / haalat / todho / warna / khatam → switch/case/break/default/end
 *    • jabtak … karo … khatam              → while loop
 *    • karo … jabtak … khatam              → do-while loop
 *    • gino … se … tak … badhao … karo … khatam → for loop (old syntax)
 *    • chalao i 1 se 10 tak / badhao i 1 / khatam → for loop (new syntax)
 *    • kaam naam(params) … wapas … khatam  → function declaration + return
 *    • naam(args)                           → function call expression
 *    • todho                                → break (loops & switch)
 *    • agla                                 → continue
 *    • aur / ya / nahi                      → logical AND / OR / NOT
 *    • %                                    → modulo
 *    • Built-ins: girda, mutlaq, chhat, farsh, quwwat, jor, lamba, pado
 *
 *  Pipeline:
 *    Source → Lexer → Parser (Recursive Descent) → Interpreter (AST Walker)
 *                                                 → Python Transpiler (bonus)
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — TOKEN TYPES
   Every terminal symbol in the grammar gets its own type constant.

   ═══════════════════════════════════════════════════════════════
   THE 7 LAYERS OF COMPILER CONSTRUCTION
   ═══════════════════════════════════════════════════════════════
   Layer 1: LEXICAL ANALYSIS (Scanner/Tokenizer)
           - Converts source code text → token stream
           - Finite automaton approach
           - Handles: keywords, identifiers, literals, operators

   Layer 2: SYNTAX ANALYSIS (Parser)
           - Converts token stream → AST (Abstract Syntax Tree)
           - Recursive descent parsing (LL(1) grammar)
           - Built into Parser class

   Layer 3: SEMANTIC ANALYSIS
           - Type checking, scope analysis, symbol table validation
           - Ensures meaning is correct beyond syntax
           - Detects undeclared variables, type mismatches

   Layer 4: INTERMEDIATE CODE GENERATION (IR)
           - Generates Three-Address Code (TAC) from AST
           - Canonical representation between source and target
           - Each instruction has max 3 operands

   Layer 5: CODE OPTIMIZATION
           - Constant folding, dead code elimination
           - Common subexpression elimination
           - Loop optimization, strength reduction

   Layer 6: TARGET CODE GENERATION
           - Converts IR → assembly-like instructions
           - Register allocation
           - Instruction selection

   Layer 7: CODE EMISSION
           - Final machine code output
           - Binary/hex representation
           - Statistics and final output
   ═══════════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════════ */
const TT = {
  // ── Original keywords ──────────────────────────────────────
  RAKHO:      'RAKHO',      // rakho      → var declare / assign
  LIKHO:      'LIKHO',      // likho      → print
  AGAR:       'AGAR',       // agar       → if
  WARNA_AGAR: 'WARNA_AGAR', // warna agar → else if  (two-word token)
  TO:         'TO',         // to         → then
  WARNA:      'WARNA',      // warna      → else / default
  KHATAM:     'KHATAM',     // khatam     → end block

  // ── New keywords v2.0 ──────────────────────────────────────
  JABTAK:     'JABTAK',     // jabtak     → while (condition)
  KARO:       'KARO',       // karo       → do / body-start
  GINO:       'GINO',       // gino       → for (old syntax)
  CHALAO:     'CHALAO',     // chalao     → for (new syntax)
  SE:         'SE',         // se         → from
  TAK:        'TAK',        // tak        → to (range end)
  BADHAO:     'BADHAO',     // badhao     → step / increment
  CHUNAO:     'CHUNAO',     // chunao     → switch
  HAALAT:     'HAALAT',     // haalat     → case
  TODHO:      'TODHO',      // todho      → break
  AGLA:       'AGLA',       // agla       → continue
  KAAM:       'KAAM',       // kaam       → function def
  WAPAS:      'WAPAS',      // wapas      → return

  // ── Literals ───────────────────────────────────────────────
  NUMBER:     'NUMBER',
  STRING:     'STRING',
  IDENT:      'IDENT',

  // ── Operators ──────────────────────────────────────────────
  PLUS:       'PLUS',       // +
  MINUS:      'MINUS',      // -
  STAR:       'STAR',       // *
  SLASH:      'SLASH',      // /
  PERCENT:    'PERCENT',    // %  (modulo)
  EQ:         'EQ',         // =
  EQEQ:       'EQEQ',       // ==
  NEQ:        'NEQ',        // !=
  GT:         'GT',         // >
  LT:         'LT',         // <
  GTE:        'GTE',        // >=
  LTE:        'LTE',        // <=
  AND:        'AND',        // aur  (logical and)
  OR:         'OR',         // ya   (logical or)
  NOT:        'NOT',        // nahi (logical not)

  // ── Punctuation ────────────────────────────────────────────
  LPAREN:     'LPAREN',     // (
  RPAREN:     'RPAREN',     // )
  COMMA:      'COMMA',      // ,

  // ── Structure ──────────────────────────────────────────────
  NEWLINE:    'NEWLINE',
  COMMENT:    'COMMENT',
  EOF:        'EOF',
};

/* Single-word keyword map.
   NOTE: "warna agar" is handled specially in the lexer (two words → one token). */
const KEYWORDS = {
  'rakho':  TT.RAKHO,
  'likho':  TT.LIKHO,
  'agar':   TT.AGAR,
  'to':     TT.TO,
  'warna':  TT.WARNA,    // may be promoted to WARNA_AGAR after peek
  'khatam': TT.KHATAM,
  'jabtak': TT.JABTAK,
  'karo':   TT.KARO,
  'gino':   TT.GINO,
  'chalao': TT.CHALAO,
  'se':     TT.SE,
  'tak':    TT.TAK,
  'badhao': TT.BADHAO,
  'chunao': TT.CHUNAO,
  'haalat': TT.HAALAT,
  'todho':  TT.TODHO,
  'agla':   TT.AGLA,
  'kaam':   TT.KAAM,
  'wapas':  TT.WAPAS,
  'aur':    TT.AND,
  'ya':     TT.OR,
  'nahi':   TT.NOT,
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — TOKEN
═══════════════════════════════════════════════════════════════ */
class Token {
  constructor(type, value, line, start, end) {
    this.type  = type;
    this.value = value;
    this.line  = line;
    this.start = start;
    this.end   = end;
  }
  toString() { return `Token(${this.type}, ${JSON.stringify(this.value)}, L${this.line}, [${this.start}:${this.end}])`; }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — LEXER
   Finite-automaton style character scanner → token stream.
═══════════════════════════════════════════════════════════════ */
class Lexer {
  constructor(source) {
    this.source = source;
    this.pos    = 0;
    this.line   = 1;
    this.tokens = [];
  }

  peek(offset = 0) { return this.source[this.pos + offset] || '\0'; }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') this.line++;
    return ch;
  }

  tokenize() {
    while (this.pos < this.source.length) this.scanToken();
    this.tokens.push(new Token(TT.EOF, null, this.line, this.pos, this.pos));
    return this.tokens;
  }

  scanToken() {
    const start = this.pos;
    const ch = this.peek();

    if (ch === ' ' || ch === '\t' || ch === '\r') { this.advance(); return; }

    if (ch === '\n') {
      this.advance();
      const last = this.tokens[this.tokens.length - 1];
      if (!last || last.type !== TT.NEWLINE)
        this.tokens.push(new Token(TT.NEWLINE, '\n', this.line, start, this.pos));
      return;
    }

    // Comment
    if (ch === '/' && this.peek(1) === '/') {
      while (this.pos < this.source.length && this.peek() !== '\n') this.advance();
      this.tokens.push(new Token(TT.COMMENT, this.source.substring(start, this.pos), this.line, start, this.pos));
      return;
    }

    if (ch === '"' || ch === "'") { this.scanString(ch); return; }
    if (this.isDigit(ch))          { this.scanNumber();   return; }
    if (this.isAlpha(ch))          { this.scanIdent();    return; }
    this.scanOperator();
  }

  scanString(quote) {
    const start = this.pos;
    const sl = this.line;
    this.advance();
    let val = '';
    while (this.pos < this.source.length && this.peek() !== quote) {
      if (this.peek() === '\n') throw new RULangError(`String mein closing ${quote} nahi mila`, sl);
      if (this.peek() === '\\') {
        this.advance();
        const e = this.advance();
        val += ({ n:'\n', t:'\t', '\\':'\\', '"':'"', "'":`'` }[e] || e);
      } else val += this.advance();
    }
    if (this.pos >= this.source.length) throw new RULangError(`String EOF par band nahi hua`, sl);
    this.advance();
    this.tokens.push(new Token(TT.STRING, val, sl, start, this.pos));
  }

  scanNumber() {
    const start = this.pos;
    const sl = this.line;
    let s = '';
    while (this.isDigit(this.peek())) s += this.advance();
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      s += this.advance();
      while (this.isDigit(this.peek())) s += this.advance();
    }
    this.tokens.push(new Token(TT.NUMBER, parseFloat(s), sl, start, this.pos));
  }

  scanIdent() {
    const start = this.pos;
    const sl = this.line;
    let name = '';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') name += this.advance();

    let type = KEYWORDS[name] || TT.IDENT;

    /* Special case: "warna" followed (after optional spaces) by "agar"
       Emit a single WARNA_AGAR token so the parser has no ambiguity. */
    if (type === TT.WARNA) {
      let lookahead = this.pos;
      while (this.source[lookahead] === ' ' || this.source[lookahead] === '\t') lookahead++;
      const rest = this.source.slice(lookahead, lookahead + 4);
      if (rest === 'agar') {
        while (this.pos < lookahead) this.advance();
        for (let i = 0; i < 4; i++) this.advance();
        type = TT.WARNA_AGAR;
        name = 'warna agar';
      }
    }

    this.tokens.push(new Token(type, name, sl, start, this.pos));
  }

  scanOperator() {
    const start = this.pos;
    const sl = this.line;
    const ch = this.advance();
    switch (ch) {
      case '+': this.tokens.push(new Token(TT.PLUS,    '+',  sl, start, this.pos)); break;
      case '-': this.tokens.push(new Token(TT.MINUS,   '-',  sl, start, this.pos)); break;
      case '*': this.tokens.push(new Token(TT.STAR,    '*',  sl, start, this.pos)); break;
      case '/': this.tokens.push(new Token(TT.SLASH,   '/',  sl, start, this.pos)); break;
      case '%': this.tokens.push(new Token(TT.PERCENT, '%',  sl, start, this.pos)); break;
      case '(': this.tokens.push(new Token(TT.LPAREN,  '(',  sl, start, this.pos)); break;
      case ')': this.tokens.push(new Token(TT.RPAREN,  ')',  sl, start, this.pos)); break;
      case ',': this.tokens.push(new Token(TT.COMMA,   ',',  sl, start, this.pos)); break;
      case '=':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TT.EQEQ, '==', sl, start, this.pos)); }
        else                      this.tokens.push(new Token(TT.EQ,   '=',  sl, start, this.pos));
        break;
      case '!':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TT.NEQ,  '!=', sl, start, this.pos)); }
        else throw new RULangError(`'!' ke baad '=' chahiye tha`, sl);
        break;
      case '>':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TT.GTE, '>=', sl, start, this.pos)); }
        else                      this.tokens.push(new Token(TT.GT,  '>',  sl, start, this.pos));
        break;
      case '<':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TT.LTE, '<=', sl, start, this.pos)); }
        else                      this.tokens.push(new Token(TT.LT,  '<',  sl, start, this.pos));
        break;
      default:
        throw new RULangError(`Anjaan character '${ch}'`, sl);
    }
  }

  isDigit(c)        { return c >= '0' && c <= '9'; }
  isAlpha(c)        { return /[a-zA-Z_]/.test(c); }
  isAlphaNumeric(c) { return /[a-zA-Z0-9_]/.test(c); }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4 — AST NODE CLASSES
   One class per grammar production rule.
═══════════════════════════════════════════════════════════════ */

class ProgramNode       { constructor(stmts)                          { this.type='Program';       this.statements=stmts; } }
class VarDeclNode       { constructor(name,expr,line)                 { this.type='VarDecl';       this.name=name; this.expr=expr; this.line=line; } }
class PrintNode         { constructor(exprs,line)                     { this.type='Print';         this.exprs=exprs; this.line=line; } }
class IfNode            { constructor(branches,elsebody,line)         { this.type='If';            this.branches=branches; this.elseBody=elsebody; this.line=line; } }
class SwitchNode        { constructor(expr,cases,defBody,line)        { this.type='Switch';        this.expr=expr; this.cases=cases; this.defaultBody=defBody; this.line=line; } }
class WhileNode         { constructor(cond,body,line)                 { this.type='While';         this.condition=cond; this.body=body; this.line=line; } }
class DoWhileNode       { constructor(body,cond,line)                 { this.type='DoWhile';       this.body=body; this.condition=cond; this.line=line; } }
class ForNode           { constructor(varName,from,to,step,body,line) { this.type='For';           this.varName=varName; this.from=from; this.to=to; this.step=step; this.body=body; this.line=line; } }
class FuncDeclNode      { constructor(name,params,body,line)          { this.type='FuncDecl';      this.name=name; this.params=params; this.body=body; this.line=line; } }
class ReturnNode        { constructor(expr,line)                      { this.type='Return';        this.expr=expr; this.line=line; } }
class BreakNode         { constructor(line)                           { this.type='Break';         this.line=line; } }
class ContinueNode      { constructor(line)                           { this.type='Continue';      this.line=line; } }
class BinaryExprNode    { constructor(left,op,right,line)             { this.type='BinaryExpr';    this.left=left; this.op=op; this.right=right; this.line=line; } }
class UnaryExprNode     { constructor(op,expr,line)                   { this.type='UnaryExpr';     this.op=op; this.expr=expr; this.line=line; } }
class NumberLiteralNode { constructor(value,line)                     { this.type='NumberLiteral'; this.value=value; this.line=line; } }
class StringLiteralNode { constructor(value,line)                     { this.type='StringLiteral'; this.value=value; this.line=line; } }
class IdentNode         { constructor(name,line)                      { this.type='Ident';         this.name=name; this.line=line; } }
class CallNode          { constructor(name,args,line)                 { this.type='Call';          this.name=name; this.args=args; this.line=line; } }

/* ═══════════════════════════════════════════════════════════════
   SECTION 5 — PARSER  (Recursive Descent, LL(1))

   Grammar (simplified):
     program      → stmt* EOF
     stmt         → varDecl | printStmt | ifStmt | switchStmt
                  | whileStmt | doWhileStmt | forStmt
                  | funcDecl | returnStmt | breakStmt | continueStmt
                  | exprStmt (bare function call)
     varDecl      → 'rakho' IDENT '=' expr NL
     printStmt    → 'likho' expr NL
     ifStmt       → 'agar' cond 'to' NL body
                    ('warna agar' cond 'to' NL body)*
                    ('warna' NL body)?
                    'khatam'
     switchStmt   → 'chunao' expr NL
                    ('haalat' expr NL body ('todho' NL)?)*
                    ('warna' NL body)?
                    'khatam'
     whileStmt    → 'jabtak' cond 'karo' NL body 'khatam'
     doWhileStmt  → 'karo' NL body 'jabtak' cond NL 'khatam'?
     forStmt      → 'gino' IDENT 'se' expr 'tak' expr ('badhao' expr)? 'karo' NL body 'khatam'
                  | 'chalao' IDENT expr 'se' expr 'tak' NL ('badhao' IDENT expr)? body 'khatam'
     funcDecl     → 'kaam' IDENT '(' params? ')' NL body 'khatam'
     returnStmt   → 'wapas' expr? NL
     breakStmt    → 'todho' NL
     continueStmt → 'agla' NL
     expr         → logicOr
     logicOr      → logicAnd ('ya' logicAnd)*
     logicAnd     → comparison ('aur' comparison)*
     comparison   → addition (compOp addition)?
     addition     → term (('+' | '-') term)*
     term         → unary (('*' | '/' | '%') unary)*
     unary        → 'nahi' unary | '-' unary | call
     call         → IDENT '(' args ')' | primary
     primary      → NUMBER | STRING | IDENT | '(' expr ')'
═══════════════════════════════════════════════════════════════ */
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos    = 0;
  }

  peek()           { return this.tokens[this.pos]; }
  advance()        { return this.tokens[this.pos++]; }
  check(type)      { return this.peek().type === type; }
  checkAny(...tt)  { return tt.includes(this.peek().type); }

  expect(type, msg) {
    if (this.check(type)) return this.advance();
    const t = this.peek();
    throw new RULangError(msg || `Expected ${type}, mila "${t.value}"`, t.line);
  }

  skipNewlines() { 
    while (this.check(TT.NEWLINE) || this.check(TT.COMMENT)) this.advance(); 
  }

  /* ── Top-level ── */
  parse() {
    this.skipNewlines();
    const stmts = [];
    while (!this.check(TT.EOF)) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    return new ProgramNode(stmts);
  }

  /* ── Statement dispatcher ── */
  parseStmt() {
    const t = this.peek();
    switch (t.type) {
      case TT.RAKHO:  return this.parseVarDecl();
      case TT.LIKHO:  return this.parsePrint();
      case TT.AGAR:   return this.parseIf();
      case TT.CHUNAO: return this.parseSwitch();
      case TT.JABTAK: return this.parseWhile();
      case TT.KARO:   return this.parseDoWhile();
      case TT.GINO:   return this.parseForOld();
      case TT.CHALAO: return this.parseForNew();
      case TT.KAAM:   return this.parseFuncDecl();
      case TT.WAPAS:  return this.parseReturn();
      case TT.TODHO:  { const l=t.line; this.advance(); this.eatNL(); return new BreakNode(l); }
      case TT.AGLA:   { const l=t.line; this.advance(); this.eatNL(); return new ContinueNode(l); }
      case TT.IDENT: {
        // Bare call statement OR variable reassign via rakho-less form
        const expr = this.parseExpr();
        this.eatNL();
        return { type: 'ExprStmt', expr, line: t.line };
      }
      default:
        throw new RULangError(`"${t.value}" se koi statement shuru nahi ho sakta`, t.line);
    }
  }

  eatNL() {
    if (this.check(TT.NEWLINE) || this.check(TT.COMMENT)) this.advance();
    while (this.check(TT.NEWLINE) || this.check(TT.COMMENT)) this.advance();
  }

  /* ── rakho x = expr ── */
  parseVarDecl() {
    const line = this.peek().line;
    this.advance(); // rakho
    const name = this.expect(TT.IDENT, `'rakho' ke baad naam chahiye`).value;
    this.expect(TT.EQ, `'${name}' ke baad '=' chahiye`);
    const expr = this.parseExpr();
    this.eatNL();
    return new VarDeclNode(name, expr, line);
  }

  /* ── likho expr [, expr, ...] ── */
  parsePrint() {
    const line = this.peek().line;
    this.advance(); // likho
    const exprs = [];
    exprs.push(this.parseExpr());
    
    // Parse additional comma-separated arguments
    while (this.peek().type === TT.COMMA) {
      this.advance(); // consume comma
      exprs.push(this.parseExpr());
    }
    
    this.eatNL();
    return new PrintNode(exprs, line);
  }

  /* ── agar … warna agar … warna … khatam ── */
  parseIf() {
    const line = this.peek().line;
    this.advance(); // agar
    const branches = [];

    const cond1 = this.parseComparison();
    // If next token is not TO, show what's actually there
    if (!this.check(TT.TO)) {
      const got = this.peek();
      throw new RULangError(
        `'agar' ke baad 'to' chahiye — mila "${got.value}" (type: ${got.type})`,
        got.line
      );
    }
    this.expect(TT.TO, '');
    this.eatNL(); this.skipNewlines();
    const body1 = this.parseBlock([TT.WARNA_AGAR, TT.WARNA, TT.KHATAM]);
    branches.push({ condition: cond1, body: body1 });

    while (this.check(TT.WARNA_AGAR)) {
      this.advance();
      const cond = this.parseComparison();
      this.expect(TT.TO, `'warna agar' ke baad 'to' chahiye`);
      this.eatNL(); this.skipNewlines();
      const body = this.parseBlock([TT.WARNA_AGAR, TT.WARNA, TT.KHATAM]);
      branches.push({ condition: cond, body });
    }

    let elseBody = null;
    if (this.check(TT.WARNA)) {
      this.advance(); this.eatNL(); this.skipNewlines();
      elseBody = this.parseBlock([TT.KHATAM]);
    }

    this.expect(TT.KHATAM, `'agar' block 'khatam' se band karo`);
    this.eatNL();
    return new IfNode(branches, elseBody, line);
  }

  /* ── chunao … haalat … todho … warna … khatam ── */
  parseSwitch() {
    const line = this.peek().line;
    this.advance(); // chunao
    const expr = this.parseExpr();
    this.eatNL(); this.skipNewlines();

    const cases = [];
    let defaultBody = null;

    while (!this.check(TT.KHATAM) && !this.check(TT.EOF)) {
      if (this.check(TT.HAALAT)) {
        this.advance();
        const val = this.parseExpr();
        this.eatNL(); this.skipNewlines();
        const body = this.parseBlock([TT.HAALAT, TT.WARNA, TT.KHATAM, TT.TODHO]);
        if (this.check(TT.TODHO)) { this.advance(); this.eatNL(); }
        this.skipNewlines();
        cases.push({ value: val, body });
      } else if (this.check(TT.WARNA)) {
        this.advance(); this.eatNL(); this.skipNewlines();
        defaultBody = this.parseBlock([TT.KHATAM]);
      } else {
        const t = this.peek();
        throw new RULangError(`'chunao' mein '${t.value}' samajh nahi aaya`, t.line);
      }
    }

    this.expect(TT.KHATAM, `'chunao' block 'khatam' se band karo`);
    this.eatNL();
    return new SwitchNode(expr, cases, defaultBody, line);
  }

  /* ── jabtak cond karo … khatam ── */
  parseWhile() {
    const line = this.peek().line;
    this.advance(); // jabtak
    const cond = this.parseComparison();
    this.expect(TT.KARO, `'jabtak' condition ke baad 'karo' chahiye`);
    this.eatNL(); this.skipNewlines();
    const body = this.parseBlock([TT.KHATAM]);
    this.expect(TT.KHATAM, `'jabtak' loop 'khatam' se band karo`);
    this.eatNL();
    return new WhileNode(cond, body, line);
  }

  /* ── karo … jabtak cond [khatam] ── */
  parseDoWhile() {
    const line = this.peek().line;
    this.advance(); // karo
    this.eatNL(); this.skipNewlines();
    const body = this.parseBlock([TT.JABTAK]);
    this.expect(TT.JABTAK, `'karo' ke baad 'jabtak' chahiye`);
    const cond = this.parseComparison();
    this.eatNL(); this.skipNewlines();
    if (this.check(TT.KHATAM)) { this.advance(); this.eatNL(); }
    return new DoWhileNode(body, cond, line);
  }

  /* ── gino i se 1 tak 10 [badhao 1] karo … khatam ── (OLD SYNTAX) */
  parseForOld() {
    const line = this.peek().line;
    this.advance(); // gino
    const varName = this.expect(TT.IDENT, `'gino' ke baad variable naam chahiye`).value;
    this.expect(TT.SE, `'gino ${varName}' ke baad 'se' chahiye`);
    const from = this.parseExpr();
    this.expect(TT.TAK, `for loop mein 'tak' chahiye`);
    const to   = this.parseExpr();
    let step = new NumberLiteralNode(1, line);
    if (this.check(TT.BADHAO)) { this.advance(); step = this.parseExpr(); }
    this.expect(TT.KARO, `'gino' ke baad 'karo' chahiye`);
    this.eatNL(); this.skipNewlines();
    const body = this.parseBlock([TT.KHATAM]);
    this.expect(TT.KHATAM, `'gino' loop 'khatam' se band karo`);
    this.eatNL();
    return new ForNode(varName, from, to, step, body, line);
  }

  /* ── chalao i 1 se 10 tak / badhao i 1 / … khatam ── (NEW SYNTAX) */
  parseForNew() {
    const line = this.peek().line;
    this.advance(); // chalao
    const varName = this.expect(TT.IDENT, `'chalao' ke baad variable naam chahiye`).value;
    const from = this.parseExpr();
    this.expect(TT.SE, `'chalao' mein 'se' chahiye`);
    const to   = this.parseExpr();
    this.expect(TT.TAK, `'chalao' mein 'tak' chahiye`);
    this.eatNL(); this.skipNewlines();
    
    // Parse optional badhao on next line
    let step = new NumberLiteralNode(1, line);
    if (this.check(TT.BADHAO)) {
      this.advance(); // badhao
      const stepVar = this.expect(TT.IDENT, `'badhao' ke baad variable naam chahiye`).value;
      if (stepVar !== varName) {
        throw new RULangError(`'badhao' mein same variable '${varName}' use kro`, this.peek().line);
      }
      const stepValue = this.parseExpr();
      this.eatNL(); this.skipNewlines();
      step = stepValue;
    }
    
    const body = this.parseBlock([TT.KHATAM]);
    this.expect(TT.KHATAM, `'chalao' loop 'khatam' se band karo`);
    this.eatNL();
    return new ForNode(varName, from, to, step, body, line);
  }

  /* ── kaam naam(params) … khatam ── */
  parseFuncDecl() {
    const line = this.peek().line;
    this.advance(); // kaam
    const name = this.expect(TT.IDENT, `'kaam' ke baad function naam chahiye`).value;
    this.expect(TT.LPAREN, `Function naam ke baad '(' chahiye`);
    const params = [];
    if (!this.check(TT.RPAREN)) {
      params.push(this.expect(TT.IDENT, `Parameter naam chahiye`).value);
      while (this.check(TT.COMMA)) {
        this.advance();
        params.push(this.expect(TT.IDENT, `Parameter naam chahiye`).value);
      }
    }
    this.expect(TT.RPAREN, `Parameters ke baad ')' chahiye`);
    this.eatNL(); this.skipNewlines();
    const body = this.parseBlock([TT.KHATAM]);
    this.expect(TT.KHATAM, `'kaam' block 'khatam' se band karo`);
    this.eatNL();
    return new FuncDeclNode(name, params, body, line);
  }

  /* ── wapas [expr] ── */
  parseReturn() {
    const line = this.peek().line;
    this.advance(); // wapas
    let expr = null;
    if (!this.check(TT.NEWLINE) && !this.check(TT.EOF)) expr = this.parseExpr();
    this.eatNL();
    return new ReturnNode(expr, line);
  }

  /* Parse statements until a stop token appears */
  parseBlock(stopTokens) {
    const stmts = [];
    while (!this.check(TT.EOF) && !stopTokens.includes(this.peek().type)) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    return stmts;
  }

  /* ── EXPRESSION PRECEDENCE CLIMBING ── */
  parseExpr()       { return this.parseLogicOr(); }

  parseLogicOr() {
    let node = this.parseLogicAnd();
    while (this.check(TT.OR)) {
      const op = this.advance().value;
      node = new BinaryExprNode(node, op, this.parseLogicAnd(), this.peek().line);
    }
    return node;
  }

  parseLogicAnd() {
    let node = this.parseComparison();
    while (this.check(TT.AND)) {
      const op = this.advance().value;
      node = new BinaryExprNode(node, op, this.parseComparison(), this.peek().line);
    }
    return node;
  }

  parseComparison() {
    let node = this.parseAddition();
    const cops = [TT.EQEQ, TT.NEQ, TT.GT, TT.LT, TT.GTE, TT.LTE];
    if (cops.includes(this.peek().type)) {
      const op = this.advance().value;
      node = new BinaryExprNode(node, op, this.parseAddition(), this.peek().line);
    }
    return node;
  }

  parseAddition() {
    let node = this.parseTerm();
    while (this.checkAny(TT.PLUS, TT.MINUS)) {
      const op = this.advance().value;
      node = new BinaryExprNode(node, op, this.parseTerm(), this.peek().line);
    }
    return node;
  }

  parseTerm() {
    let node = this.parseUnary();
    while (this.checkAny(TT.STAR, TT.SLASH, TT.PERCENT)) {
      const op = this.advance().value;
      node = new BinaryExprNode(node, op, this.parseUnary(), this.peek().line);
    }
    return node;
  }

  parseUnary() {
    if (this.check(TT.NOT)) {
      const l = this.peek().line; this.advance();
      return new UnaryExprNode('nahi', this.parseUnary(), l);
    }
    if (this.check(TT.MINUS)) {
      const l = this.peek().line; this.advance();
      return new UnaryExprNode('-', this.parseUnary(), l);
    }
    return this.parseCall();
  }

  parseCall() {
    const t = this.peek();
    if (t.type === TT.IDENT && this.tokens[this.pos + 1]?.type === TT.LPAREN) {
      const name = this.advance().value;
      const line = t.line;
      this.advance(); // (
      const args = [];
      if (!this.check(TT.RPAREN)) {
        args.push(this.parseExpr());
        while (this.check(TT.COMMA)) { this.advance(); args.push(this.parseExpr()); }
      }
      this.expect(TT.RPAREN, `Function call mein ')' chahiye`);
      return new CallNode(name, args, line);
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.peek();
    if (t.type === TT.NUMBER) { this.advance(); return new NumberLiteralNode(t.value, t.line); }
    if (t.type === TT.STRING) { this.advance(); return new StringLiteralNode(t.value, t.line); }
    if (t.type === TT.IDENT)  { this.advance(); return new IdentNode(t.value, t.line); }
    if (t.type === TT.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TT.RPAREN, `')' chahiye tha`);
      return expr;
    }
    throw new RULangError(`Expression mein "${t.value}" samajh nahi aaya`, t.line);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 6 — CONTROL FLOW SIGNALS
   Thrown as values (not errors) to implement break/continue/return
   in the tree-walking interpreter.
═══════════════════════════════════════════════════════════════ */
class BreakSignal    { constructor()      { this.type = 'BreakSignal'; } }
class ContinueSignal { constructor()      { this.type = 'ContinueSignal'; } }
class ReturnSignal   { constructor(value) { this.type = 'ReturnSignal'; this.value = value; } }

/* ═══════════════════════════════════════════════════════════════
   SECTION 7 — ENVIRONMENT (Lexical Scope Chain)
   Each function call / block gets its own Environment that
   delegates lookups to its parent, enabling lexical scoping.
═══════════════════════════════════════════════════════════════ */
class Environment {
  constructor(parent = null) {
    this.vars   = new Map();
    this.parent = parent;
  }

  get(name, line) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent)          return this.parent.get(name, line);
    throw new RULangError(`"${name}" naam ka koi variable nahi mila! 'rakho' se declare karo`, line);
  }

  set(name, value) {
    if (this.vars.has(name))                   { this.vars.set(name, value); return; }
    if (this.parent && this.parent.has(name))  { this.parent.set(name, value); return; }
    this.vars.set(name, value);
  }

  define(name, value) { this.vars.set(name, value); }
  has(name)           { return this.vars.has(name) || (this.parent?.has(name) ?? false); }
  snapshot()          { return new Map(this.vars); }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 8 — INTERPRETER  (AST Walker)
═══════════════════════════════════════════════════════════════ */
class Interpreter {
  constructor() {
    this.globalEnv = new Environment();
    this.output    = [];
    this.callDepth = 0;
    this.MAX_DEPTH = 200;
    this.MAX_ITER  = 100_000;
  }

  interpret(ast) {
    this.globalEnv = new Environment();
    this.output    = [];
    this.callDepth = 0;
    this.execBlock(ast.statements, this.globalEnv);
    return this.output;
  }

  execBlock(stmts, env) {
    for (const stmt of stmts) {
      const sig = this.execStmt(stmt, env);
      if (sig instanceof BreakSignal || sig instanceof ContinueSignal || sig instanceof ReturnSignal)
        return sig;
    }
    return null;
  }

  execStmt(node, env) {
    switch (node.type) {
      case 'VarDecl':   return this.execVarDecl(node, env);
      case 'Print':     return this.execPrint(node, env);
      case 'If':        return this.execIf(node, env);
      case 'Switch':    return this.execSwitch(node, env);
      case 'While':     return this.execWhile(node, env);
      case 'DoWhile':   return this.execDoWhile(node, env);
      case 'For':       return this.execFor(node, env);
      case 'FuncDecl':  return this.execFuncDecl(node, env);
      case 'Return':    return this.execReturn(node, env);
      case 'Break':     return new BreakSignal();
      case 'Continue':  return new ContinueSignal();
      case 'ExprStmt':  this.evalExpr(node.expr, env); return null;
      default:          throw new RULangError(`Anjaan statement: ${node.type}`, node.line);
    }
  }

  execVarDecl(node, env) {
    env.set(node.name, this.evalExpr(node.expr, env));
    return null;
  }

  execPrint(node, env) {
    const parts = node.exprs.map(expr => this.stringify(this.evalExpr(expr, env)));
    this.output.push(parts.join(''));
    return null;
  }

  execIf(node, env) {
    for (const branch of node.branches) {
      if (this.isTruthy(this.evalExpr(branch.condition, env)))
        return this.execBlock(branch.body, new Environment(env));
    }
    if (node.elseBody) return this.execBlock(node.elseBody, new Environment(env));
    return null;
  }

  execSwitch(node, env) {
    const val = this.evalExpr(node.expr, env);
    for (const c of node.cases) {
      if (this.evalExpr(c.value, env) === val) {
        const sig = this.execBlock(c.body, new Environment(env));
        if (sig instanceof BreakSignal) return null;
        return sig;
      }
    }
    if (node.defaultBody) {
      const sig = this.execBlock(node.defaultBody, new Environment(env));
      if (sig instanceof BreakSignal) return null;
      return sig;
    }
    return null;
  }

  execWhile(node, env) {
    let iters = 0;
    while (this.isTruthy(this.evalExpr(node.condition, env))) {
      if (++iters > this.MAX_ITER)
        throw new RULangError(`Infinite loop! ${this.MAX_ITER} iterations — 'todho' lagao`, node.line);
      const sig = this.execBlock(node.body, new Environment(env));
      if (sig instanceof BreakSignal)    break;
      if (sig instanceof ContinueSignal) continue;
      if (sig instanceof ReturnSignal)   return sig;
    }
    return null;
  }

  execDoWhile(node, env) {
    let iters = 0;
    do {
      if (++iters > this.MAX_ITER)
        throw new RULangError(`Infinite do-while! ${this.MAX_ITER} iterations`, node.line);
      const sig = this.execBlock(node.body, new Environment(env));
      if (sig instanceof BreakSignal)    break;
      if (sig instanceof ContinueSignal) { /* re-check condition */ continue; }
      if (sig instanceof ReturnSignal)   return sig;
    } while (this.isTruthy(this.evalExpr(node.condition, env)));
    return null;
  }

  execFor(node, env) {
    const loopEnv = new Environment(env);
    let counter   = this.evalExpr(node.from, env);
    const end     = this.evalExpr(node.to,   env);
    const step    = this.evalExpr(node.step, env);

    if (typeof counter !== 'number' || typeof end !== 'number' || typeof step !== 'number')
      throw new RULangError(`'gino' loop mein sirf numbers chalte hain`, node.line);
    if (step === 0)
      throw new RULangError(`'badhao' zero nahi ho sakta!`, node.line);

    loopEnv.define(node.varName, counter);
    let iters = 0;
    const cond = step > 0 ? () => counter <= end : () => counter >= end;

    while (cond()) {
      if (++iters > this.MAX_ITER)
        throw new RULangError(`'gino' loop ${this.MAX_ITER} dafa chal chuka`, node.line);
      loopEnv.define(node.varName, counter);
      const bodyEnv = new Environment(loopEnv);
      const sig = this.execBlock(node.body, bodyEnv);
      if (sig instanceof BreakSignal)    break;
      if (sig instanceof ContinueSignal) { counter += step; continue; }
      if (sig instanceof ReturnSignal)   return sig;
      counter += step;
    }
    return null;
  }

  execFuncDecl(node, env) {
    env.define(node.name, {
      __type__: 'RULangFunction',
      name:     node.name,
      params:   node.params,
      body:     node.body,
      closure:  env,
    });
    return null;
  }

  execReturn(node, env) {
    const val = node.expr ? this.evalExpr(node.expr, env) : null;
    return new ReturnSignal(val);
  }

  /* ── EXPRESSION EVALUATOR ── */
  evalExpr(node, env) {
    switch (node.type) {
      case 'NumberLiteral': return node.value;
      case 'StringLiteral': return node.value;
      case 'Ident':         return env.get(node.name, node.line);
      case 'UnaryExpr':     return this.evalUnary(node, env);
      case 'BinaryExpr':    return this.evalBinary(node, env);
      case 'Call':          return this.callFunction(node, env);
      default:              throw new RULangError(`Anjaan expression: ${node.type}`, node.line);
    }
  }

  evalUnary(node, env) {
    const val = this.evalExpr(node.expr, env);
    if (node.op === '-') {
      if (typeof val !== 'number') throw new RULangError(`Minus ke liye number chahiye`, node.line);
      return -val;
    }
    if (node.op === 'nahi') return !this.isTruthy(val);
    throw new RULangError(`Anjaan unary: ${node.op}`, node.line);
  }

  evalBinary(node, env) {
    const op = node.op;
    // Short-circuit
    if (op === 'aur') { const l = this.evalExpr(node.left, env); return this.isTruthy(l) ? this.evalExpr(node.right, env) : l; }
    if (op === 'ya')  { const l = this.evalExpr(node.left, env); return this.isTruthy(l) ? l : this.evalExpr(node.right, env); }

    const left  = this.evalExpr(node.left,  env);
    const right = this.evalExpr(node.right, env);

    switch (op) {
      case '+':
        return (typeof left === 'string' || typeof right === 'string')
          ? this.stringify(left) + this.stringify(right)
          : left + right;
      case '-':  this.assertNums(left,right,op,node.line); return left - right;
      case '*':  this.assertNums(left,right,op,node.line); return left * right;
      case '/':  this.assertNums(left,right,op,node.line);
                 if (right === 0) throw new RULangError(`Zero se taqseem nahi hoti!`, node.line);
                 return left / right;
      case '%':  this.assertNums(left,right,op,node.line);
                 if (right === 0) throw new RULangError(`Zero se modulo nahi hota!`, node.line);
                 return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '>':  this.assertNums(left,right,op,node.line); return left > right;
      case '<':  this.assertNums(left,right,op,node.line); return left < right;
      case '>=': this.assertNums(left,right,op,node.line); return left >= right;
      case '<=': this.assertNums(left,right,op,node.line); return left <= right;
      default:   throw new RULangError(`Anjaan operator: '${op}'`, node.line);
    }
  }

  callFunction(node, env) {
    if (this.callDepth >= this.MAX_DEPTH)
      throw new RULangError(`Stack overflow! Recursion bohat deep hai`, node.line);

    // ── Built-in functions ──────────────────────────────────
    const evalledArgs = node.args.map(a => this.evalExpr(a, env));
    const builtins = {
      girda:    ([n])    => { this.chkNum(n,'girda',node.line); return Math.round(n); },
      mutlaq:   ([n])    => { this.chkNum(n,'mutlaq',node.line); return Math.abs(n); },
      chhat:    ([n])    => { this.chkNum(n,'chhat',node.line); return Math.ceil(n); },
      farsh:    ([n])    => { this.chkNum(n,'farsh',node.line); return Math.floor(n); },
      quwwat:   ([a,b])  => { this.chkNum(a,'quwwat',node.line); this.chkNum(b,'quwwat',node.line); return Math.pow(a,b); },
      jor:      ([a,b])  => String(a) + String(b),
      lamba:    ([s])    => typeof s === 'string' ? s.length : 0,
      inputLo:     ([msg])  => {
        const promptMsg = msg === undefined || msg === null ? '' : this.stringify(msg);
        if (typeof globalThis.prompt === 'function') {
          const result = globalThis.prompt(promptMsg);
          return result === null ? '' : String(result);
        }
        return '';
      },
      toStr:    ([v])    => this.stringify(v),
      toNum:    ([v])    => parseFloat(v) || 0,
    };

    if (builtins[node.name]) return builtins[node.name](evalledArgs);

    // ── User-defined function ────────────────────────────────
    const fn = env.get(node.name, node.line);
    if (!fn || fn.__type__ !== 'RULangFunction')
      throw new RULangError(`"${node.name}" koi function nahi hai`, node.line);

    if (evalledArgs.length !== fn.params.length)
      throw new RULangError(
        `"${fn.name}" ko ${fn.params.length} arguments chahiye, diye ${evalledArgs.length}`,
        node.line
      );

    const callEnv = new Environment(fn.closure);
    fn.params.forEach((p, i) => callEnv.define(p, evalledArgs[i]));

    this.callDepth++;
    const sig = this.execBlock(fn.body, callEnv);
    this.callDepth--;

    if (sig instanceof ReturnSignal) return sig.value;
    return null;
  }

  chkNum(v, name, line) {
    if (typeof v !== 'number') throw new RULangError(`'${name}' ko number chahiye, mila: ${v}`, line);
  }
  assertNums(l, r, op, line) {
    if (typeof l !== 'number' || typeof r !== 'number')
      throw new RULangError(`'${op}' ke liye dono number chahiye, mila: "${l}" aur "${r}"`, line);
  }
  isTruthy(v)    { return !(v === false || v === 0 || v === '' || v === null || v === undefined); }
  stringify(v)   {
    if (v === null || v === undefined) return 'khaali';
    if (typeof v === 'boolean') return v ? 'sach' : 'jhooth';
    if (v && v.__type__ === 'RULangFunction') return `[kaam: ${v.name}]`;
    return String(v);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 9 — PYTHON TRANSPILER  (AST → Python source)
═══════════════════════════════════════════════════════════════ */
class PythonTranspiler {
  transpile(ast) {
    return [
      '# ─────────────────────────────────────────',
      '# Generated by RULang Python Transpiler v2',
      '# Roman Urdu → Python',
      '# ─────────────────────────────────────────',
      '',
      ...ast.statements.map(s => this.stmt(s, 0)),
    ].join('\n');
  }

  ind(n) { return '    '.repeat(n); }

  stmt(node, d) {
    const I = this.ind(d);
    switch (node.type) {
      case 'VarDecl':   return `${I}${node.name} = ${this.expr(node.expr)}`;
      case 'Print':     return `${I}print(${node.exprs.map(e => this.expr(e)).join(' + ')})`;
      case 'ExprStmt':  return `${I}${this.expr(node.expr)}`;
      case 'Break':     return `${I}break`;
      case 'Continue':  return `${I}continue`;
      case 'Return':    return `${I}return${node.expr ? ' ' + this.expr(node.expr) : ''}`;

      case 'If': {
        let out = '';
        node.branches.forEach((b, i) => {
          out += `${I}${i === 0 ? 'if' : 'elif'} ${this.expr(b.condition)}:\n`;
          out += (b.body.length ? b.body.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`) + '\n';
        });
        if (node.elseBody) {
          out += `${I}else:\n`;
          out += (node.elseBody.length ? node.elseBody.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`) + '\n';
        }
        return out.trimEnd();
      }

      case 'Switch': {
        let out = `${I}_sw = ${this.expr(node.expr)}\n${I}# chunao (switch)\n`;
        node.cases.forEach((c, i) => {
          out += `${I}${i === 0 ? 'if' : 'elif'} _sw == ${this.expr(c.value)}:\n`;
          out += (c.body.length ? c.body.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`) + '\n';
        });
        if (node.defaultBody) {
          out += `${I}else:\n`;
          out += node.defaultBody.map(s => this.stmt(s, d+1)).join('\n') + '\n';
        }
        return out.trimEnd();
      }

      case 'While': {
        let out = `${I}while ${this.expr(node.condition)}:\n`;
        out += (node.body.length ? node.body.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`);
        return out;
      }

      case 'DoWhile': {
        let out = `${I}while True:  # do-while\n`;
        out += node.body.map(s => this.stmt(s, d+1)).join('\n') + '\n';
        out += `${this.ind(d+1)}if not (${this.expr(node.condition)}): break`;
        return out;
      }

      case 'For': {
        const step = this.expr(node.step);
        let out = `${I}for ${node.varName} in range(int(${this.expr(node.from)}), int(${this.expr(node.to)}) + 1, int(${step})):\n`;
        out += (node.body.length ? node.body.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`);
        return out;
      }

      case 'FuncDecl': {
        const params = node.params.join(', ');
        let out = `${I}def ${node.name}(${params}):\n`;
        out += (node.body.length ? node.body.map(s => this.stmt(s, d+1)).join('\n') : `${this.ind(d+1)}pass`);
        return out;
      }

      default: return `${I}# [${node.type}]`;
    }
  }

  expr(node) {
    if (!node) return 'None';
    switch (node.type) {
      case 'NumberLiteral': return String(node.value);
      case 'StringLiteral': return `"${node.value.replace(/"/g, '\\"')}"`;
      case 'Ident':         return node.name;
      case 'UnaryExpr':     return node.op === 'nahi' ? `(not ${this.expr(node.expr)})` : `(-${this.expr(node.expr)})`;
      case 'BinaryExpr': {
        const opMap = { 'aur':'and', 'ya':'or' };
        return `(${this.expr(node.left)} ${opMap[node.op]||node.op} ${this.expr(node.right)})`;
      }
      case 'Call': {
        const builtinMap = { girda:'round', mutlaq:'abs', chhat:'math.ceil', farsh:'math.floor', quwwat:'pow', lamba:'len', inputLo:'input' };
        const name = builtinMap[node.name] || node.name;
        return `${name}(${node.args.map(a => this.expr(a)).join(', ')})`;
      }
      default: return '# ?';
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-B — SEMANTIC ANALYZER
   Layer 3: Type checking, scope analysis, symbol table validation
═══════════════════════════════════════════════════════════════ */
class SemanticAnalyzer {
  constructor() {
    this.symbolTable = new Map(); // name → { type, scope, line, defined }
    this.currentScope = 'global';
    this.errors = [];
    this.warnings = [];
    this.scopeStack = ['global'];
    this.functions = new Map(); // function name → params info
  }

  analyze(ast) {
    this.symbolTable = new Map();
    this.errors = [];
    this.warnings = [];
    this.scopeStack = ['global'];
    this.functions = new Map();
    this.currentScope = 'global';

    // First pass: collect all function declarations
    this.collectFunctions(ast);

    // Second pass: analyze each statement
    this.analyzeStatements(ast.statements);

    return {
      symbolTable: this.symbolTable,
      errors: this.errors,
      warnings: this.warnings,
      report: this.generateReport()
    };
  }

  collectFunctions(ast) {
    for (const stmt of ast.statements) {
      if (stmt.type === 'FuncDecl') {
        this.functions.set(stmt.name, {
          params: stmt.params,
          paramTypes: stmt.params.map(() => 'any'),
          line: stmt.line,
          body: stmt.body
        });
      }
    }
  }

  analyzeStatements(stmts) {
    for (const stmt of stmts) {
      this.analyzeStmt(stmt);
    }
  }

  analyzeStmt(node) {
    switch (node.type) {
      case 'VarDecl':
        this.analyzeVarDecl(node);
        break;
      case 'FuncDecl':
        this.analyzeFuncDecl(node);
        break;
      case 'Print':
        this.analyzeExpr(node.expr);
        break;
      case 'If':
        this.analyzeIf(node);
        break;
      case 'Switch':
        this.analyzeSwitch(node);
        break;
      case 'While':
      case 'DoWhile':
        this.analyzeLoop(node);
        break;
      case 'For':
        this.analyzeFor(node);
        break;
      case 'Return':
        if (node.expr) this.analyzeExpr(node.expr);
        break;
      case 'Break':
      case 'Continue':
        // Validated at runtime/context level
        break;
      case 'ExprStmt':
        this.analyzeExpr(node.expr);
        break;
    }
  }

  analyzeVarDecl(node) {
    // Check if already defined in current scope
    const existing = this.symbolTable.get(node.name);
    if (existing && existing.scope === this.currentScope) {
      this.warnings.push({
        type: 'Shadowing',
        message: `Variable "${node.name}" shadows existing variable in same scope`,
        line: node.line
      });
    }

    const exprType = this.analyzeExpr(node.expr);

    // Infer type from expression
    let inferredType = 'any';
    if (exprType === 'number') inferredType = 'number';
    else if (exprType === 'string') inferredType = 'string';
    else if (exprType === 'boolean') inferredType = 'boolean';

    this.symbolTable.set(node.name, {
      name: node.name,
      type: inferredType,
      scope: this.currentScope,
      line: node.line,
      defined: true,
      initialized: true
    });
  }

  analyzeFuncDecl(node) {
    const prevScope = this.currentScope;
    this.currentScope = node.name;
    this.scopeStack.push(node.name);

    // Add parameters to symbol table
    for (const param of node.params) {
      this.symbolTable.set(param, {
        name: param,
        type: 'any',
        scope: node.name,
        line: node.line,
        defined: true,
        initialized: false,
        isParam: true
      });
    }

    // Analyze function body
    this.analyzeStatements(node.body);

    this.scopeStack.pop();
    this.currentScope = prevScope;
  }

  analyzeIf(node) {
    for (const branch of node.branches) {
      const condType = this.analyzeExpr(branch.condition);
      if (condType !== 'boolean' && condType !== 'any') {
        this.warnings.push({
          type: 'TypeWarning',
          message: `Condition should be boolean, got "${condType}"`,
          line: node.line
        });
      }
      this.analyzeStatements(branch.body);
    }
    if (node.elseBody) {
      this.analyzeStatements(node.elseBody);
    }
  }

  analyzeSwitch(node) {
    this.analyzeExpr(node.expr);
    for (const c of node.cases) {
      this.analyzeExpr(c.value);
      this.analyzeStatements(c.body);
    }
    if (node.defaultBody) {
      this.analyzeStatements(node.defaultBody);
    }
  }

  analyzeLoop(node) {
    if (node.type === 'While') {
      const condType = this.analyzeExpr(node.condition);
      if (condType !== 'boolean' && condType !== 'any') {
        this.warnings.push({
          type: 'TypeWarning',
          message: `Loop condition should be boolean, got "${condType}"`,
          line: node.line
        });
      }
    } else if (node.type === 'DoWhile') {
      const condType = this.analyzeExpr(node.condition);
      if (condType !== 'boolean' && condType !== 'any') {
        this.warnings.push({
          type: 'TypeWarning',
          message: `Loop condition should be boolean, got "${condType}"`,
          line: node.line
        });
      }
    } else if (node.type === 'For') {
      this.analyzeExpr(node.from);
      this.analyzeExpr(node.to);
      this.analyzeExpr(node.step);
    }
    this.analyzeStatements(node.body);
  }

  analyzeFor(node) {
    // Add loop variable to symbol table
    this.symbolTable.set(node.varName, {
      name: node.varName,
      type: 'number',
      scope: this.currentScope,
      line: node.line,
      defined: true,
      initialized: true,
      isLoopVar: true
    });

    this.analyzeExpr(node.from);
    this.analyzeExpr(node.to);
    this.analyzeExpr(node.step);
    this.analyzeStatements(node.body);
  }

  analyzeExpr(node) {
    if (!node) return 'any';

    switch (node.type) {
      case 'NumberLiteral':
        return 'number';
      case 'StringLiteral':
        return 'string';
      case 'Ident': {
        const sym = this.symbolTable.get(node.name);
        if (!sym) {
          this.errors.push({
            type: 'UndefinedVariable',
            message: `Variable "${node.name}" is not declared`,
            line: node.line
          });
          return 'undefined';
        }
        if (!sym.initialized && !sym.isParam) {
          this.warnings.push({
            type: 'Uninitialized',
            message: `Variable "${node.name}" may be used before initialization`,
            line: node.line
          });
        }
        return sym.type;
      }
      case 'BinaryExpr': {
        const left = this.analyzeExpr(node.left);
        const right = this.analyzeExpr(node.right);

        // Logical operators
        if (node.op === 'aur' || node.op === 'ya') {
          return 'boolean';
        }

        // Comparison operators
        if (['==', '!=', '>', '<', '>=', '<='].includes(node.op)) {
          return 'boolean';
        }

        // Arithmetic operators
        if (['+', '-', '*', '/', '%'].includes(node.op)) {
          if (left === 'string' || right === 'string') return 'string';
          if (left === 'number' && right === 'number') return 'number';
          return 'any';
        }

        return 'any';
      }
      case 'UnaryExpr': {
        if (node.op === 'nahi') return 'boolean';
        return this.analyzeExpr(node.expr);
      }
      case 'Call': {
        const fn = this.functions.get(node.name);
        if (!fn && !this.getBuiltinFunction(node.name)) {
          this.errors.push({
            type: 'UndefinedFunction',
            message: `Function "${node.name}" is not defined`,
            line: node.line
          });
          return 'undefined';
        }
        if (fn && node.args.length !== fn.params.length) {
          this.errors.push({
            type: 'ArgumentCount',
            message: `Function "${node.name}" expects ${fn.params.length} arguments, got ${node.args.length}`,
            line: node.line
          });
        }
        node.args.forEach(arg => this.analyzeExpr(arg));
        return 'any';
      }
      default:
        return 'any';
    }
  }

  getBuiltinFunction(name) {
    const builtins = ['girda', 'mutlaq', 'chhat', 'farsh', 'quwwat', 'jor', 'lamba', 'toStr', 'toNum'];
    return builtins.includes(name);
  }

  generateReport() {
    let report = '';

    report += '<div class="semantic-section">';
    report += '<div class="semantic-section__title"><span>✓</span> Symbol Table</div>';
    report += '<table class="semantic-table"><thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Line</th></tr></thead><tbody>';

    this.symbolTable.forEach((sym, name) => {
      const scopeLabel = sym.isParam ? `param:${sym.scope}` : sym.scope;
      report += `<tr><td style="color:var(--cyan)">${name}</td><td>${sym.type}</td><td>${scopeLabel}</td><td>${sym.line}</td></tr>`;
    });

    if (this.symbolTable.size === 0) {
      report += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No variables declared</td></tr>';
    }
    report += '</tbody></table></div>';

    report += '<div class="semantic-section">';
    report += '<div class="semantic-section__title"><span>⚡</span> Functions</div>';
    report += '<table class="semantic-table"><thead><tr><th>Name</th><th>Parameters</th><th>Line</th></tr></thead><tbody>';

    this.functions.forEach((fn, name) => {
      report += `<tr><td style="color:var(--amber)">${name}</td><td>${fn.params.join(', ')}</td><td>${fn.line}</td></tr>`;
    });

    if (this.functions.size === 0) {
      report += '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No functions declared</td></tr>';
    }
    report += '</tbody></table></div>';

    if (this.errors.length > 0) {
      report += '<div class="semantic-section">';
      report += '<div class="semantic-section__title"><span>✗</span> Errors</div>';
      this.errors.forEach(err => {
        report += `<div class="check-fail" style="padding:8px;margin-bottom:4px;border-left:3px solid var(--red-err)">[L${err.line}] ${err.type}: ${err.message}</div>`;
      });
      report += '</div>';
    }

    if (this.warnings.length > 0) {
      report += '<div class="semantic-section">';
      report += '<div class="semantic-section__title"><span>⚠</span> Warnings</div>';
      this.warnings.forEach(warn => {
        report += `<div class="check-warn" style="padding:8px;margin-bottom:4px;border-left:3px solid var(--amber)">[L${warn.line}] ${warn.type}: ${warn.message}</div>`;
      });
      report += '</div>';
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      report += '<div class="semantic-section">';
      report += '<div class="check-pass" style="padding:12px;text-align:center;border:1px solid var(--green-dim);border-radius:var(--radius-sm)">✓ Semantic analysis passed! No errors or warnings.</div>';
      report += '</div>';
    }

    return report;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-C — IR CODE GENERATOR (Three-Address Code)
   Layer 4: Generate Three-Address Code from AST
═══════════════════════════════════════════════════════════════ */
class IRGenerator {
  constructor() {
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
    this.stringCount = 0;
  }

  generate(ast) {
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
    this.stringCount = 0;

    this.generateStatements(ast.statements);

    return {
      instructions: this.instructions,
      report: this.formatReport()
    };
  }

  newTemp() {
    return `t${this.tempCount++}`;
  }

  newLabel(prefix = 'L') {
    return `${prefix}${this.labelCount++}`;
  }

  emit(op, arg1 = null, arg2 = null, result = null, comment = null) {
    const instr = {
      op,
      arg1,
      arg2,
      result,
      comment
    };
    this.instructions.push(instr);
    return result || this.newTemp();
  }

  generateStatements(stmts) {
    for (const stmt of stmts) {
      this.generateStmt(stmt);
    }
  }

  generateStmt(node) {
    switch (node.type) {
      case 'VarDecl': {
        const result = this.generateExpr(node.expr);
        this.emit('STORE', result, null, node.name);
        break;
      }
      case 'Print': {
        const values = node.exprs.map(expr => this.generateExpr(expr));
        for (const value of values) {
          this.emit('PRINT', value, null, null, `likho`);
        }
        break;
      }
      case 'If': {
        this.generateIf(node);
        break;
      }
      case 'Switch': {
        this.generateSwitch(node);
        break;
      }
      case 'While': {
        this.generateWhile(node);
        break;
      }
      case 'DoWhile': {
        this.generateDoWhile(node);
        break;
      }
      case 'For': {
        this.generateFor(node);
        break;
      }
      case 'FuncDecl': {
        this.generateFuncDecl(node);
        break;
      }
      case 'Return': {
        if (node.expr) {
          const value = this.generateExpr(node.expr);
          this.emit('RETURN', value, null, null);
        } else {
          this.emit('RETURN', null, null, null);
        }
        break;
      }
      case 'Break': {
        this.emit('GOTO', null, null, 'BREAK_TARGET');
        break;
      }
      case 'Continue': {
        this.emit('GOTO', null, null, 'CONTINUE_TARGET');
        break;
      }
      case 'ExprStmt': {
        this.generateExpr(node.expr);
        break;
      }
    }
  }

  generateExpr(node) {
    if (!node) return null;

    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral': {
        const label = this.newLabel('STR');
        this.emit('STRING', node.value, null, label);
        return label;
      }

      case 'Ident':
        return node.name;

      case 'BinaryExpr': {
        const left = this.generateExpr(node.left);
        const right = this.generateExpr(node.right);

        if (node.op === 'aur' || node.op === 'ya') {
          // Short-circuit evaluation
          const result = this.newTemp();
          const trueLabel = this.newLabel('TRUE');
          const endLabel = this.newLabel('END');

          if (node.op === 'aur') {
            this.emit('IF_FALSE_GOTO', left, null, endLabel);
            this.emit('IF_FALSE_GOTO', right, null, endLabel);
            this.emit('ASSIGN', 1, null, result);
            this.emit('GOTO', null, null, endLabel);
            this.emit('LABEL', null, null, endLabel);
            this.emit('ASSIGN', 0, null, result);
          } else {
            this.emit('IF_TRUE_GOTO', left, null, trueLabel);
            this.emit('IF_TRUE_GOTO', right, null, trueLabel);
            this.emit('ASSIGN', 0, null, result);
            this.emit('GOTO', null, null, endLabel);
            this.emit('LABEL', null, null, trueLabel);
            this.emit('ASSIGN', 1, null, result);
            this.emit('LABEL', null, null, endLabel);
          }
          return result;
        }

        const result = this.newTemp();
        const opMap = {
          '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD',
          '==': 'EQ', '!=': 'NEQ', '>': 'GT', '<': 'LT', '>=': 'GTE', '<=': 'LTE'
        };
        this.emit(opMap[node.op] || node.op, left, right, result);
        return result;
      }

      case 'UnaryExpr': {
        if (node.op === 'nahi') {
          const val = this.generateExpr(node.expr);
          const result = this.newTemp();
          this.emit('NOT', val, null, result);
          return result;
        }
        if (node.op === '-') {
          const val = this.generateExpr(node.expr);
          const result = this.newTemp();
          this.emit('NEG', val, null, result);
          return result;
        }
        return this.generateExpr(node.expr);
      }

      case 'Call': {
        const args = node.args.map(arg => this.generateExpr(arg));
        const result = this.newTemp();
        this.emit('CALL', node.name, args.length, result);
        return result;
      }

      default:
        return null;
    }
  }

  generateIf(node) {
    const endLabels = [];

    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i];
      const condValue = this.generateExpr(branch.condition);
      const falseLabel = this.newLabel('ELSE');

      this.emit('IF_FALSE_GOTO', condValue, null, falseLabel);
      this.generateStatements(branch.body);
      this.emit('GOTO', null, null, 'END_IF');

      if (i < node.branches.length - 1) {
        endLabels.push(falseLabel);
      } else {
        endLabels.push('END_IF');
      }
    }

    // Handle else if branches
    const mergedLabel = this.newLabel('MERGE');
    this.emit('LABEL', null, null, mergedLabel);
  }

  generateSwitch(node) {
    const switchExpr = this.generateExpr(node.expr);
    const endLabels = [];

    for (const c of node.cases) {
      const caseValue = this.generateExpr(c.value);
      const caseLabel = this.newLabel('CASE');
      const result = this.newTemp();

      this.emit('EQ', switchExpr, caseValue, result);
      this.emit('IF_TRUE_GOTO', result, null, caseLabel);
      endLabels.push(caseLabel);
    }

    if (node.defaultBody) {
      this.generateStatements(node.defaultBody);
    }
  }

  generateWhile(node) {
    const startLabel = this.newLabel('WHILE_START');
    const endLabel = this.newLabel('WHILE_END');

    this.emit('LABEL', null, null, startLabel);
    const condValue = this.generateExpr(node.condition);
    this.emit('IF_FALSE_GOTO', condValue, null, endLabel);
    this.generateStatements(node.body);
    this.emit('GOTO', null, null, startLabel);
    this.emit('LABEL', null, null, endLabel);
  }

  generateDoWhile(node) {
    const startLabel = this.newLabel('DO_START');
    const endLabel = this.newLabel('DO_END');

    this.emit('LABEL', null, null, startLabel);
    this.generateStatements(node.body);
    const condValue = this.generateExpr(node.condition);
    this.emit('IF_TRUE_GOTO', condValue, null, startLabel);
    this.emit('LABEL', null, null, endLabel);
  }

  generateFor(node) {
    const startLabel = this.newLabel('FOR_START');
    const condLabel = this.newLabel('FOR_COND');
    const endLabel = this.newLabel('FOR_END');
    const stepLabel = this.newLabel('FOR_STEP');

    // Initialization
    const fromValue = this.generateExpr(node.from);
    this.emit('STORE', fromValue, null, node.varName);

    // Jump to condition check
    this.emit('GOTO', null, null, condLabel);

    // Loop body
    this.emit('LABEL', null, null, startLabel);
    this.generateStatements(node.body);

    // Step
    this.emit('LABEL', null, null, stepLabel);
    const stepValue = this.generateExpr(node.step);
    const current = this.newTemp();
    this.emit('LOAD', node.varName, null, current);
    this.emit('ADD', current, stepValue, node.varName);
    this.emit('GOTO', null, null, condLabel);

    // Condition
    this.emit('LABEL', null, null, condLabel);
    const toValue = this.generateExpr(node.to);
    const cond = this.newTemp();
    this.emit('LTE', node.varName, toValue, cond);
    this.emit('IF_TRUE_GOTO', cond, null, startLabel);
    this.emit('LABEL', null, null, endLabel);
  }

  generateFuncDecl(node) {
    const entryLabel = this.newLabel('FUNC_' + node.name.toUpperCase());

    this.emit('FUNC_BEGIN', node.name, node.params.length, entryLabel);

    for (const stmt of node.body) {
      this.generateStmt(stmt);
    }

    this.emit('FUNC_END', node.name);
  }

  formatReport() {
    let html = '<div class="ir-code">';
    html += '<div style="color:var(--amber);margin-bottom:12px;font-family:var(--font-ui);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Three-Address Code Instructions</div>';

    this.instructions.forEach((instr, i) => {
      html += '<div class="ir-line">';
      html += `<span class="ir-label">${i + 1}:</span>`;

      const opStr = instr.op || '';
      html += `<span class="ir-opcode">${opStr}</span>`;

      const args = [];
      if (instr.arg1 !== null && instr.arg1 !== undefined) args.push(String(instr.arg1));
      if (instr.arg2 !== null && instr.arg2 !== undefined) args.push(String(instr.arg2));

      if (args.length > 0) {
        html += `<span class="ir-args">${args.join(', ')}</span>`;
      }

      if (instr.result) {
        html += `<span style="color:var(--green)"> → ${instr.result}</span>`;
      }

      if (instr.comment) {
        html += `<span class="ir-comment">; ${instr.comment}</span>`;
      }

      html += '</div>';
    });

    if (this.instructions.length === 0) {
      html += '<div style="color:var(--text-muted);text-align:center;padding:20px">No IR instructions generated</div>';
    }

    html += '</div>';
    html += `<div style="margin-top:12px;padding:10px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <span style="color:var(--text-dim)">Total Instructions: </span>
      <span style="color:var(--cyan)">${this.instructions.length}</span>
    </div>`;

    return html;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-D — OPTIMIZER
   Layer 5: Code optimization - constant folding, dead code elimination
═══════════════════════════════════════════════════════════════ */
class Optimizer {
  constructor() {
    this.optimizations = [];
    this.originalInstructions = [];
  }

  optimize(irCode) {
    this.optimizations = [];
    this.originalInstructions = [...irCode.instructions];
    let instructions = [...irCode.instructions];

    // Run optimizations
    instructions = this.constantFolding(instructions);
    instructions = this.deadCodeElimination(instructions);
    instructions = this.commonSubexpressionElimination(instructions);
    instructions = this.copyPropagation(instructions);

    return {
      original: irCode,
      optimized: {
        instructions,
        report: this.formatReport(instructions)
      },
      stats: this.calculateStats(this.originalInstructions, instructions)
    };
  }

  constantFolding(instructions) {
    const result = [];

    for (const instr of instructions) {
      if (instr.op === 'ADD' || instr.op === 'SUB' || instr.op === 'MUL' || instr.op === 'DIV' || instr.op === 'MOD') {
        if (typeof instr.arg1 === 'number' && typeof instr.arg2 === 'number') {
          let computed;
          switch (instr.op) {
            case 'ADD': computed = instr.arg1 + instr.arg2; break;
            case 'SUB': computed = instr.arg1 - instr.arg2; break;
            case 'MUL': computed = instr.arg1 * instr.arg2; break;
            case 'DIV': computed = instr.arg1 / instr.arg2; break;
            case 'MOD': computed = instr.arg1 % instr.arg2; break;
          }
          this.optimizations.push({
            type: 'Constant Folding',
            before: `${instr.op} ${instr.arg1} ${instr.arg2}`,
            after: `Constant ${computed}`,
            line: result.length
          });
          result.push({ ...instr, op: 'ASSIGN', arg1: computed, arg2: null });
          continue;
        }
      }
      result.push(instr);
    }

    return result;
  }

  deadCodeElimination(instructions) {
    const usedVars = new Set();
    const result = [];

    // Find all used variables
    for (const instr of instructions) {
      if (instr.arg1 && typeof instr.arg1 === 'string') usedVars.add(instr.arg1);
      if (instr.arg2 && typeof instr.arg2 === 'string') usedVars.add(instr.arg2);
      if (instr.result && typeof instr.result === 'string' && !instr.result.startsWith('t') && !instr.result.startsWith('L')) {
        usedVars.add(instr.result);
      }
    }

    // Remove unused assignments to temp variables
    let changed = false;
    for (const instr of instructions) {
      if (instr.op === 'STORE' && instr.result && instr.result.startsWith('t')) {
        if (!usedVars.has(instr.result)) {
          this.optimizations.push({
            type: 'Dead Code Elimination',
            before: `STORE ${instr.arg1} → ${instr.result}`,
            after: 'Removed (unused)',
            line: result.length
          });
          changed = true;
          continue;
        }
      }
      result.push(instr);
    }

    return changed ? this.deadCodeElimination(result) : result;
  }

  commonSubexpressionElimination(instructions) {
    const seenExpr = new Map();
    const result = [];

    for (const instr of instructions) {
      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'].includes(instr.op)) {
        const key = `${instr.op}(${instr.arg1}, ${instr.arg2})`;
        if (seenExpr.has(key)) {
          this.optimizations.push({
            type: 'Common Subexpression',
            before: `${instr.op} ${instr.arg1} ${instr.arg2} → ${instr.result}`,
            after: `Reuse ${seenExpr.get(key)}`,
            line: result.length
          });
          result.push({ ...instr, arg1: seenExpr.get(key), arg2: null, op: 'COPY' });
        } else {
          seenExpr.set(key, instr.result);
        }
      }
      result.push(instr);
    }

    return result;
  }

  copyPropagation(instructions) {
    const copies = new Map();
    const result = [];

    for (const instr of instructions) {
      let arg1 = instr.arg1;
      let arg2 = instr.arg2;

      // Propagate copies
      if (arg1 && copies.has(arg1)) arg1 = copies.get(arg1);
      if (arg2 && copies.has(arg2)) arg2 = copies.get(arg2);

      result.push({ ...instr, arg1, arg2 });

      // Track copy instructions
      if (instr.op === 'ASSIGN' && instr.result && typeof instr.arg1 === 'string') {
        copies.set(instr.result, instr.arg1);
      }
    }

    return result;
  }

  calculateStats(original, optimized) {
    return {
      originalInstructions: original.length,
      optimizedInstructions: optimized.length,
      instructionsRemoved: original.length - optimized.length,
      optimizationsApplied: this.optimizations.length
    };
  }

  formatReport(instructions) {
    let html = '<div class="optimize-compare">';

    // Before optimization
    html += '<div class="optimize-panel">';
    html += '<div class="optimize-panel__header optimize-panel__header--before">Before Optimization</div>';
    html += '<div class="optimize-panel__code">';
    html += this.formatInstructions(instructions);
    html += '</div></div>';

    // After optimization
    html += '<div class="optimize-panel">';
    html += '<div class="optimize-panel__header optimize-panel__header--after">After Optimization</div>';
    html += '<div class="optimize-panel__code">';
    html += this.formatInstructions(instructions);
    html += '</div></div>';

    html += '</div>';

    // Statistics
    html += '<div class="optimize-stats">';
    html += '<div class="optimize-stats__title">Optimization Statistics</div>';
    html += `<div class="optimize-stat"><span class="optimize-stat__label">Original Instructions</span><span class="optimize-stat__value">${this.originalInstructions.length}</span></div>`;
    html += `<div class="optimize-stat"><span class="optimize-stat__label">Instructions After</span><span class="optimize-stat__value">${instructions.length}</span></div>`;
    html += `<div class="optimize-stat"><span class="optimize-stat__label">Optimizations Applied</span><span class="optimize-stat__value optimize-stat__value--improved">${this.optimizations.length}</span></div>`;
    html += '</div>';

    // Optimization details
    if (this.optimizations.length > 0) {
      html += '<div class="optimize-stats" style="margin-top:16px">';
      html += '<div class="optimize-stats__title">Applied Optimizations</div>';
      this.optimizations.forEach(opt => {
        html += `<div style="padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--amber)">${opt.type}:</span>
          <span style="color:var(--text-dim);margin-left:8px">${opt.before}</span>
          <span style="color:var(--green);margin-left:8px">→ ${opt.after}</span>
        </div>`;
      });
      html += '</div>';
    }

    return html;
  }

  formatInstructions(instructions) {
    let html = '';
    instructions.forEach((instr, i) => {
      const args = [];
      if (instr.arg1 !== null && instr.arg1 !== undefined) args.push(String(instr.arg1));
      if (instr.arg2 !== null && instr.arg2 !== undefined) args.push(String(instr.arg2));

      html += `<div style="padding:2px 0;color:var(--text-dim)">${i + 1}: <span style="color:var(--purple)">${instr.op || ''}</span>`;
      if (args.length > 0) html += ` ${args.join(', ')}`;
      if (instr.result) html += ` → <span style="color:var(--cyan)">${instr.result}</span>`;
      html += '</div>';
    });
    return html;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-E — TARGET CODE GENERATOR
   Layer 6: Generate assembly-like instructions from IR
═══════════════════════════════════════════════════════════════ */
class TargetCodeGenerator {
  constructor() {
    this.instructions = [];
    this.registers = ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi'];
    this.regPool = [...this.registers];
    this.usedRegisters = new Set();
    this.codeSegment = [];
    this.dataSegment = [];
    this.addressCounter = 0;
  }

  generate(optimizedIR) {
    this.instructions = [];
    this.regPool = [...this.registers];
    this.usedRegisters = new Set();
    this.codeSegment = [];
    this.dataSegment = [];
    this.addressCounter = 0x1000;

    for (const instr of optimizedIR.instructions) {
      this.generateInstr(instr);
    }

    return {
      instructions: this.instructions,
      report: this.formatReport()
    };
  }

  allocReg() {
    if (this.regPool.length === 0) {
      return 'eax'; // Default fallback
    }
    const reg = this.regPool.pop();
    this.usedRegisters.add(reg);
    return reg;
  }

  freeReg(reg) {
    this.usedRegisters.delete(reg);
    if (!this.regPool.includes(reg)) {
      this.regPool.push(reg);
    }
  }

  genAddr(size = 1) {
    const addr = this.addressCounter;
    this.addressCounter += size * 4;
    return '0x' + addr.toString(16).toUpperCase();
  }

  generateInstr(instr) {
    const addr = this.genAddr();

    switch (instr.op) {
      case 'ASSIGN':
        this.emit(addr, 'MOV', `[${instr.result}]`, instr.arg1);
        break;

      case 'STORE':
        this.emit(addr, 'MOV', `[${instr.result}]`, instr.arg1);
        break;

      case 'LOAD':
        this.emit(addr, 'MOV', instr.result ? `[${instr.result}]` : instr.result, instr.arg1);
        break;

      case 'ADD':
        this.emitArith('ADD', instr, addr);
        break;

      case 'SUB':
        this.emitArith('SUB', instr, addr);
        break;

      case 'MUL':
        this.emitArith('IMUL', instr, addr);
        break;

      case 'DIV':
        this.emitArith('IDIV', instr, addr);
        break;

      case 'MOD':
        this.emitMod(instr, addr);
        break;

      case 'EQ':
      case 'NEQ':
      case 'GT':
      case 'LT':
      case 'GTE':
      case 'LTE':
        this.emitCompare(instr, addr);
        break;

      case 'NEG':
        this.emit(addr, 'NEG', instr.arg1);
        if (instr.result) this.emit(null, 'MOV', `[${instr.result}]`, 'eax');
        break;

      case 'NOT':
        this.emit(addr, 'NOT', instr.arg1);
        if (instr.result) this.emit(null, 'MOV', `[${instr.result}]`, 'eax');
        break;

      case 'PRINT':
        this.emit(addr, 'CALL', 'print', null, `; likho: ${instr.arg1}`);
        break;

      case 'CALL':
        this.emitCall(instr, addr);
        break;

      case 'RETURN':
        this.emit(addr, 'MOV', 'eax', instr.arg1 || '0');
        this.emit(null, 'RET');
        break;

      case 'FUNC_BEGIN':
        this.emit(addr, `${instr.result}:`, null, null, `; function ${instr.arg1}`);
        this.emit(null, 'PUSH', 'ebp');
        this.emit(null, 'MOV', 'ebp', 'esp');
        break;

      case 'FUNC_END':
        this.emit(addr, 'LEAVE', null, null, `; end ${instr.arg1}`);
        this.emit(null, 'RET');
        break;

      case 'LABEL':
        this.emit(addr, `${instr.result}:`, null, null, '; label');
        break;

      case 'GOTO':
        this.emit(addr, 'JMP', instr.result);
        break;

      case 'IF_TRUE_GOTO':
        this.emit(addr, 'JE', instr.result, null, `; if ${instr.arg1}`);
        break;

      case 'IF_FALSE_GOTO':
        this.emit(addr, 'JNE', instr.result, null, `; if not ${instr.arg1}`);
        break;

      case 'STRING':
        this.dataSegment.push(`${instr.result}: db "${instr.arg1}", 0`);
        break;

      default:
        if (instr.op) {
          this.emit(addr, '; ' + instr.op, instr.arg1, instr.arg2, instr.result);
        }
    }
  }

  emit(addr, op, arg1, arg2, comment = null) {
    const instruction = {
      addr: addr,
      op,
      arg1,
      arg2,
      comment
    };
    this.instructions.push(instruction);
    this.codeSegment.push(instruction);
  }

  emitArith(op, instr, addr) {
    const reg = this.allocReg();
    this.emit(addr, 'MOV', reg, instr.arg1);
    this.emit(null, op, reg, instr.arg2);
    if (instr.result) {
      this.emit(null, 'MOV', `[${instr.result}]`, reg);
    }
    this.freeReg(reg);
  }

  emitMod(instr, addr) {
    const reg = this.allocReg();
    this.emit(addr, 'MOV', reg, instr.arg1);
    this.emit(null, 'XOR', 'edx', 'edx');
    this.emit(null, 'DIV', instr.arg2);
    this.emit(null, 'MOV', reg, 'edx');
    if (instr.result) {
      this.emit(null, 'MOV', `[${instr.result}]`, reg);
    }
    this.freeReg(reg);
  }

  emitCompare(instr, addr) {
    const reg = this.allocReg();
    this.emit(addr, 'MOV', reg, instr.arg1);
    this.emit(null, 'CMP', reg, instr.arg2);

    const jmpOps = { 'EQ': 'JE', 'NEQ': 'JNE', 'GT': 'JG', 'LT': 'JL', 'GTE': 'JGE', 'LTE': 'JLE' };
    const trueLabel = this.newLabel('TRUE');
    const endLabel = this.newLabel('END');

    this.emit(null, jmpOps[instr.op] || 'JE', trueLabel);
    this.emit(null, 'MOV', reg, '0');
    this.emit(null, 'JMP', endLabel);
    this.emit(null, `${trueLabel}:`, null, null, '; true');
    this.emit(null, 'MOV', reg, '1');
    this.emit(null, `${endLabel}:`, null, null, '; end');

    if (instr.result) {
      this.emit(null, 'MOV', `[${instr.result}]`, reg);
    }
    this.freeReg(reg);
  }

  emitCall(instr, addr) {
    this.emit(addr, 'CALL', instr.arg1, null, `; call ${instr.arg1}`);
    if (instr.result) {
      this.emit(null, 'MOV', `[${instr.result}]`, 'eax');
    }
  }

  newLabel(prefix = 'L') {
    return `${prefix}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  formatReport() {
    let html = '<div class="target-code">';

    // Data segment
    if (this.dataSegment.length > 0) {
      html += '<div class="target-section">';
      html += '<div class="target-section__title">DATA SEGMENT</div>';
      for (const item of this.dataSegment) {
        html += `<div class="target-line">
          <span class="target-line__addr"></span>
          <span class="target-line__instr">${item.split(':')[0]}</span>
          <span class="target-line__ops">${item.split(':').slice(1).join(':').trim()}</span>
        </div>`;
      }
      html += '</div>';
    }

    // Code segment
    html += '<div class="target-section">';
    html += '<div class="target-section__title">CODE SEGMENT</div>';
    for (const instr of this.codeSegment) {
      html += '<div class="target-line">';

      if (instr.addr) {
        html += `<span class="target-line__addr">${instr.addr}</span>`;
      } else {
        html += '<span class="target-line__addr"></span>';
      }

      html += `<span class="target-line__instr">${instr.op || ''}</span>`;

      const ops = [];
      if (instr.arg1) ops.push(String(instr.arg1));
      if (instr.arg2) ops.push(String(instr.arg2));
      if (ops.length > 0) {
        html += `<span class="target-line__ops">${ops.join(', ')}</span>`;
      }

      if (instr.comment) {
        html += `<span class="target-line__comment">${instr.comment}</span>`;
      }

      html += '</div>';
    }
    html += '</div>';

    html += '</div>';
    html += `<div style="margin-top:12px;padding:10px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <span style="color:var(--text-dim)">Total Instructions: </span>
      <span style="color:var(--cyan)">${this.codeSegment.length}</span>
    </div>`;

    return html;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-F — CODE EMITTER
   Layer 7: Final machine code output with binary/hex representation
═══════════════════════════════════════════════════════════════ */
class CodeEmitter {
  constructor() {
    this.binaryCode = [];
    this.hexCode = [];
    this.finalOutput = [];
  }

  emit(targetCode) {
    this.binaryCode = [];
    this.hexCode = [];
    this.finalOutput = [];

    for (const instr of targetCode.instructions) {
      this.emitInstruction(instr);
    }

    return {
      binary: this.binaryCode,
      hex: this.hexCode,
      report: this.formatReport(targetCode)
    };
  }

  emitInstruction(instr) {
    // Map operations to opcode bytes
    const opcodes = {
      'MOV': 0xB8,
      'ADD': 0x01,
      'SUB': 0x29,
      'IMUL': 0xAF,
      'IDIV': 0xF7,
      'NEG': 0xF7,
      'NOT': 0xF7,
      'XOR': 0x31,
      'CMP': 0x39,
      'JE': 0x74,
      'JNE': 0x75,
      'JG': 0x7F,
      'JL': 0x7C,
      'JGE': 0x7D,
      'JLE': 0x7E,
      'JMP': 0xEB,
      'CALL': 0xE8,
      'RET': 0xC3,
      'PUSH': 0x50,
      'POP': 0x58,
      'LEAVE': 0xC9,
      'INT': 0xCD,
    };

    // Generate pseudo-machine code
    let bytes = [];

    if (instr.op === 'MOV' && instr.arg1 === 'eax') {
      bytes = [0xB8]; // MOV EAX, imm32
      bytes.push(...this.packValue(instr.arg2 || 0));
    } else if (instr.op === 'MOV' && instr.arg1 && instr.arg2) {
      bytes = [0xC7]; // MOV r/m32, imm32
      bytes.push(0x05); // EAX addressing
      bytes.push(...this.packValue(instr.arg2));
    } else if (instr.op === 'ADD') {
      bytes = [0x01]; // ADD r/m32, r32
      bytes.push(0xC0 | 0); // EAX + EAX
    } else if (instr.op === 'SUB') {
      bytes = [0x29]; // SUB r/m32, r32
      bytes.push(0xC0 | 0);
    } else if (instr.op === 'PUSH') {
      bytes = [0x50]; // PUSH EAX
    } else if (instr.op === 'POP') {
      bytes = [0x58]; // POP EAX
    } else if (instr.op === 'RET') {
      bytes = [0xC3];
    } else if (instr.op === 'LEAVE') {
      bytes = [0xC9];
    } else if (instr.op === 'NEG') {
      bytes = [0xF7, 0xD8]; // NEG EAX
    } else if (instr.op === 'NOT') {
      bytes = [0xF7, 0xD0]; // NOT EAX
    } else if (instr.op === 'XOR') {
      bytes = [0x31, 0xC0]; // XOR EAX, EAX
    } else if (instr.op === 'CMP') {
      bytes = [0x39, 0xC0]; // CMP EAX, EAX
    } else if (instr.op === 'JE') {
      bytes = [0x74, 0x00]; // JE +0
    } else if (instr.op === 'JNE') {
      bytes = [0x75, 0x00]; // JNE +0
    } else if (instr.op === 'JMP') {
      bytes = [0xEB, 0x00]; // JMP +0
    } else if (instr.op === 'CALL') {
      bytes = [0xE8, 0x00, 0x00, 0x00, 0x00]; // CALL rel32
    } else if (instr.op === 'INT') {
      bytes = [0xCD, 0x80]; // INT 80h (Linux syscall)
    } else if (instr.op && instr.op.endsWith(':')) {
      // Label - just a marker
      bytes = [];
    } else {
      // NOP padding for other instructions
      bytes = [0x90]; // NOP
    }

    this.binaryCode.push(...bytes);

    // Convert to hex
    const hexStr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    this.hexCode.push({
      addr: instr.addr || '',
      bytes: hexStr,
      instr: instr.op || '',
      comment: instr.comment || ''
    });
  }

  packValue(val) {
    if (typeof val === 'number') {
      return [
        val & 0xFF,
        (val >> 8) & 0xFF,
        (val >> 16) & 0xFF,
        (val >> 24) & 0xFF
      ];
    }
    if (typeof val === 'string') {
      // Pack string as bytes
      const bytes = [];
      for (let i = 0; i < val.length && i < 4; i++) {
        bytes.push(val.charCodeAt(i));
      }
      while (bytes.length < 4) bytes.push(0);
      return bytes;
    }
    return [0, 0, 0, 0];
  }

  formatReport(targetCode) {
    let html = '<div class="emission-final">';
    html += '<div style="color:var(--amber);margin-bottom:12px;font-family:var(--font-ui);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Machine Code Output</div>';

    // Hex dump
    html += '<div class="emission-hex">';
    this.hexCode.forEach((line, i) => {
      if (line.bytes || line.instr.endsWith(':')) {
        html += `<div style="padding:3px 0;">`;
        html += `<span style="color:var(--text-muted);min-width:80px;display:inline-block">${line.addr || ''}</span>`;
        html += `<span style="color:var(--cyan);min-width:120px;display:inline-block">${line.bytes || ''}</span>`;
        html += `<span style="color:var(--text-secondary)">${line.instr}</span>`;
        if (line.comment) {
          html += `<span style="color:var(--text-muted);font-style:italic"> ; ${line.comment}</span>`;
        }
        html += `</div>`;
      }
    });
    html += '</div>';

    // Binary representation
    if (this.binaryCode.length > 0) {
      html += '<div class="emission-binary">';
      html += '<div style="margin-bottom:8px;color:var(--text-dim)">Binary:</div>';
      html += '<div style="word-break:break-all;">';
      for (let i = 0; i < this.binaryCode.length; i++) {
        html += this.binaryCode[i].toString(2).padStart(8, '0') + ' ';
        if ((i + 1) % 16 === 0) html += '\n';
      }
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';

    // Statistics
    html += '<div class="emission-stats">';
    html += '<div class="emission-stats__title">Compilation Statistics</div>';

    html += `<div class="optimize-stat">
      <span class="optimize-stat__label">Source Instructions</span>
      <span class="optimize-stat__value">${targetCode.instructions.length}</span>
    </div>`;

    html += `<div class="optimize-stat">
      <span class="optimize-stat__label">Machine Code Bytes</span>
      <span class="optimize-stat__value">${this.binaryCode.length}</span>
    </div>`;

    html += `<div class="optimize-stat">
      <span class="optimize-stat__label">Hex Characters</span>
      <span class="optimize-stat__value">${this.binaryCode.length * 2}</span>
    </div>`;

    html += `<div class="optimize-stat">
      <span class="optimize-stat__label">Compilation Layers</span>
      <span class="optimize-stat__value optimize-stat__value--improved">7/7</span>
    </div>`;

    html += '</div>';

    return html;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3-G — LAYER DEMONSTRATION GENERATOR
   Creates detailed step-by-step demonstration for each layer
═══════════════════════════════════════════════════════════════ */
class LayerDemonstrator {
  constructor() {
    this.demos = {};
  }

  generate(source, tokens, ast, semanticResult, irResult, optResult, targetResult, emissionResult) {
    let html = '<div class="demo-layers">';

    // Layer 1: Lexical Analysis
    html += this.demoLayer1(source, tokens);

    // Layer 2: Syntax Analysis
    html += this.demoLayer2(ast);

    // Layer 3: Semantic Analysis
    html += this.demoLayer3(semanticResult);

    // Layer 4: IR Generation
    html += this.demoLayer4(irResult);

    // Layer 5: Optimization
    html += this.demoLayer5(optResult);

    // Layer 6: Target Code Generation
    html += this.demoLayer6(targetResult);

    // Layer 7: Code Emission
    html += this.demoLayer7(emissionResult);

    html += '</div>';
    return html;
  }

  demoLayer1(source, tokens) {
    let html = `<div class="demo-layer" data-layer="1">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">1</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">LEXICAL ANALYSIS (Scanner/Tokenizer)</div>
          <div class="demo-layer__subtitle">Converts source code text into token stream</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">The Lexer scans the source code character by character using a <span class="demo-step__highlight">Finite Automaton</span> approach. It identifies:
• Keywords (rakho, likho, agar, etc.)
• Identifiers (variable names)
• Numbers (integers and decimals)
• Strings (text in quotes)
• Operators (+, -, *, /, ==, etc.)
• Punctuation (parentheses, commas)</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📥 Input: Source Code</div>
          <div class="demo-step__content"><code>${this.escapeHtml(source)}</code></div>
        </div>

        <div class="demo-flow">
          <div class="demo-flow__input"><code>rakho x = 10</code></div>
          <div>
            <div class="demo-flow__label">Finite Automaton</div>
            <div class="demo-flow__arrow">→</div>
          </div>
          <div class="demo-flow__output"><code>RAKHO IDENT EQ NUMBER</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📤 Output: Token Stream</div>
          <div class="demo-step__content"><code>${tokens.map(t => `${t.type}(${JSON.stringify(t.value)})`).join(' → ')}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🧠 How It Works</div>
          <div class="demo-step__content">1. <span class="demo-step__highlight">peek()</span> - Look at current character
2. <span class="demo-step__highlight">advance()</span> - Move to next character
3. Based on character type, route to:
   • <code>scanString()</code> - Handle "quoted text"
   • <code>scanNumber()</code> - Handle 123, 45.67
   • <code>scanIdent()</code> - Handle names and keywords
   • <code>scanOperator()</code> - Handle +, -, ==, etc.</div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> The lexer treats the source code as a stream of characters and groups them into meaningful tokens. It's like a <em>word tokenizer</em> in NLP - converting raw text into structured units that the parser can understand.
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer2(ast) {
    let html = `<div class="demo-layer" data-layer="2">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">2</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">SYNTAX ANALYSIS (Parser)</div>
          <div class="demo-layer__subtitle">Builds Abstract Syntax Tree (AST) from tokens</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">The Parser uses <span class="demo-step__highlight">Recursive Descent Parsing</span> with LL(1) grammar. It processes the token stream according to grammar rules and builds an AST where each node represents a language construct.</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📥 Input: Token Stream</div>
          <div class="demo-step__content"><code>RAKHO → IDENT(x) → EQ → NUMBER(10)</code></div>
        </div>

        <div class="demo-flow">
          <div class="demo-flow__input"><code>RAKHO IDENT EQ NUMBER</code></div>
          <div>
            <div class="demo-flow__label">Recursive Descent</div>
            <div class="demo-flow__arrow">→</div>
          </div>
          <div class="demo-flow__output"><code>VarDeclNode(x = 10)</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🌳 AST Structure</div>
          <div class="demo-step__content"><code>${this.astToString(ast)}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🧠 How It Works</div>
          <div class="demo-step__content">1. <span class="demo-step__highlight">parse()</span> - Top-level parser entry
2. <span class="demo-step__highlight">parseStmt()</span> - Dispatch to statement handlers
3. <span class="demo-step__highlight">parseExpr()</span> - Build expression trees with precedence climbing
4. <span class="demo-step__highlight">expect()</span> - Validate expected token types</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📋 Node Types Created</div>
          <div class="demo-step__content"><code>ProgramNode, VarDeclNode, PrintNode, IfNode, WhileNode, ForNode, FuncDeclNode, BinaryExprNode, etc.</code></div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> The AST is a tree structure where the root represents the entire program, and each child node represents a sub-expression or statement. This hierarchical structure makes it easy to traverse and interpret.
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer3(semanticResult) {
    let html = `<div class="demo-layer" data-layer="3">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">3</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">SEMANTIC ANALYSIS</div>
          <div class="demo-layer__subtitle">Type checking, scope analysis, symbol validation</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">Semantic analysis validates the <em>meaning</em> of the program beyond syntax. It checks:
• <span class="demo-step__highlight">Type Safety</span> - Are operations between compatible types?
• <span class="demo-step__highlight">Scope Analysis</span> - Are variables declared before use?
• <span class="demo-step__highlight">Symbol Table</span> - Track all declared variables</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📊 Symbol Table</div>
          <div class="demo-step__content"><code>${this.renderSymbolTable(semanticResult.symbolTable)}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">✅ Type Inference Rules</div>
          <div class="demo-step__content"><code>NUMBER + NUMBER → number
STRING + ANY → string
ARG1 > ARG2 → boolean
aur / ya → boolean
nahi X → boolean</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">⚠️ Error Detection</div>
          <div class="demo-step__content"><code>${semanticResult.errors.length === 0 ? 'No errors detected!' : semanticResult.errors.map(e => `${e.type}: ${e.message}`).join('\n')}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🧠 How It Works</div>
          <div class="demo-step__content">1. <span class="demo-step__highlight">First Pass</span> - Collect all function declarations
2. <span class="demo-step__highlight">Second Pass</span> - Analyze each statement
3. <span class="demo-step__highlight">analyzeExpr()</span> - Infer and check expression types
4. <span class="demo-step__highlight">Symbol Table</span> - Map names to type/scope info</div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> Just because syntax is correct doesn't mean the program makes sense. Semantic analysis catches logical errors like using an undeclared variable or comparing incompatible types.
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer4(irResult) {
    let html = `<div class="demo-layer" data-layer="4">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">4</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">IR GENERATION (Three-Address Code)</div>
          <div class="demo-layer__subtitle">Converts AST to intermediate representation</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">IR Generation produces <span class="demo-step__highlight">Three-Address Code (TAC)</span> - a simple intermediate representation where each instruction has at most 3 operands. This serves as an interface between source and target code.</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📋 TAC Instruction Types</div>
          <div class="demo-step__content"><code>MOV dest, src      // Assignment
ADD dest, a, b    // Binary ops
SUB dest, a, b
CMP a, b          // Comparison
IF_TRUE_GOTO L    // Branching
LABEL L:          // Labels
CALL fn, args     // Function calls
PRINT val         // Output</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🔄 Translation Examples</div>
          <div class="demo-step__content"><code>x = y + z          →  t0 = ADD y, z
                    →  MOV x, t0

likho x           →  PRINT x

agar x > 5 to    →  t1 = GT x, 5
                    →  IF_FALSE_GOTO t1, L1
                    →  ... body ...
                    →  LABEL L1:</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📤 Generated IR Instructions</div>
          <div class="demo-step__content"><code>${irResult.instructions.slice(0, 20).map((instr, i) => `${i+1}: ${instr.op} ${instr.arg1 || ''} ${instr.arg2 || ''} → ${instr.result || ''}`).join('\n')}</code></div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> IR is machine-independent and simpler than both source and target code. It allows optimizations to be written once and applied to any target (x86, ARM, JVM, etc.).
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer5(optResult) {
    let html = `<div class="demo-layer" data-layer="5">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">5</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">CODE OPTIMIZATION</div>
          <div class="demo-layer__subtitle">Improves code efficiency through transformations</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 Optimization Techniques</div>
          <div class="demo-step__content">1. <span class="demo-step__highlight">Constant Folding</span> - Evaluate constant expressions at compile time
2. <span class="demo-step__highlight">Dead Code Elimination</span> - Remove unused instructions
3. <span class="demo-step__highlight">Common Subexpression</span> - Reuse computed values
4. <span class="demo-step__highlight">Copy Propagation</span> - Substitute variable copies</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📊 Statistics</div>
          <div class="demo-step__content"><code>Original Instructions: ${optResult.stats.originalInstructions}
Optimized Instructions: ${optResult.stats.optimizedInstructions}
Optimizations Applied: ${optResult.stats.optimizationsApplied}
Instructions Removed: ${optResult.stats.instructionsRemoved}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🔄 Before vs After</div>
          <div class="demo-step__content"><code>BEFORE:                    AFTER:
t0 = ADD 2, 3               t0 = 5        (Constant Folding)
MOV x, t0                   MOV x, t0
STORE x, t1                 [removed]     (Dead Code)</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🧠 Optimization Examples</div>
          <div class="demo-step__content"><code>Constant Folding:
  x = 2 + 3  →  x = 5

Dead Code Elimination:
  t0 = 5     (t0 never used)
  [removed]

Common Subexpression:
  t0 = ADD a, b
  t1 = ADD a, b  →  t1 = t0</code></div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> Optimization makes programs run faster without changing their semantics. The goal is to reduce instruction count, improve register usage, and eliminate redundant computations.
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer6(targetResult) {
    let html = `<div class="demo-layer" data-layer="6">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">6</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">TARGET CODE GENERATION</div>
          <div class="demo-layer__subtitle">Generates assembly-like instructions from IR</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">Target code generation converts IR to <span class="demo-step__highlight">x86 assembly-like instructions</span>. This involves:
• <span class="demo-step__highlight">Instruction Selection</span> - Map IR ops to machine ops
• <span class="demo-step__highlight">Register Allocation</span> - Assign values to CPU registers
• <span class="demo-step__highlight">Address Calculation</span> - Compute memory addresses</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🖥️ x86 Instruction Set</div>
          <div class="demo-step__content"><code>MOV reg, imm        // Move immediate to register
ADD reg1, reg2      // Add registers
SUB reg1, reg2     // Subtract registers
IMUL reg           // Multiply by EAX
IDIV reg           // Divide by EAX
CMP reg1, reg2     // Compare registers
JE/JNE label       // Conditional jump
JMP label          // Unconditional jump
PUSH/POP reg       // Stack operations
CALL addr          // Function call
RET                // Return from function</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🔄 IR to Assembly Mapping</div>
          <div class="demo-step__content"><code>IR: ADD t0, a, b        →  ASM: MOV eax, a
                                           ADD eax, b
                                           MOV t0, eax

IR: PRINT x           →  ASM: MOV eax, x
                                           CALL print

IR: IF x > 5 GOTO L   →  ASM: CMP eax, 5
                                           JLE L_next
                                           JMP L_target</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">📤 Generated Assembly</div>
          <div class="demo-step__content"><code>${targetResult.instructions.slice(0, 15).map(instr =>
            `${instr.addr || '     '}  ${instr.op || ''} ${instr.arg1 || ''} ${instr.arg2 || ''}`
          ).join('\n')}</code></div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> Target code is specific to a CPU architecture. x86 is the most common for desktops, but the same IR could generate ARM (mobile), RISC-V, or JVM bytecode.
        </div>
      </div>
    </div>`;
    return html;
  }

  demoLayer7(emissionResult) {
    let html = `<div class="demo-layer" data-layer="7">
      <div class="demo-layer__header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="demo-layer__num">7</div>
        <div class="demo-layer__info">
          <div class="demo-layer__title">CODE EMISSION</div>
          <div class="demo-layer__subtitle">Final machine code output in hex and binary</div>
        </div>
        <div class="demo-layer__toggle">▼</div>
      </div>
      <div class="demo-layer__body">
        <div class="demo-step">
          <div class="demo-step__title">🔍 What Happens Here</div>
          <div class="demo-step__content">Code emission is the final step that converts assembly instructions to <span class="demo-step__highlight">actual machine code bytes</span>. Each assembly instruction maps to specific binary opcodes that the CPU can execute directly.</div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🔢 Opcode Mapping</div>
          <div class="demo-step__content"><code>MOV EAX, imm    →  B8 [4 bytes imm]
ADD r/m, r     →  01 C0
PUSH EAX       →  50
POP EAX        →  58
RET            →  C3
NEG EAX        →  F7 D8
CALL rel32     →  E8 [4 bytes offset]
JMP +offs      →  EB [1 byte offset]</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🔣 Hex Dump</div>
          <div class="demo-step__content"><code>${emissionResult.hex.slice(0, 10).map(h =>
            `${h.addr || ''}  ${h.bytes || ''}  ; ${h.instr}`
          ).join('\n')}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">💾 Statistics</div>
          <div class="demo-step__content"><code>Total Instructions: ${emissionResult.hex.length}
Machine Code Bytes: ${emissionResult.binary.length}
Hex String Length: ${emissionResult.binary.length * 2} characters
Binary Representation: ${emissionResult.binary.map(b => b.toString(2).padStart(8, '0')).join(' ')}</code></div>
        </div>

        <div class="demo-step">
          <div class="demo-step__title">🧠 From Assembly to Machine Code</div>
          <div class="demo-step__content"><code>Assembly:     MOV eax, 42
Hex:           B8 2A 00 00 00
Binary:       10111000 00101010 00000000 00000000 00000000

Assembly:     ADD eax, ebx
Hex:           01 C0
Binary:       00000001 11000000

Assembly:     RET
Hex:           C3
Binary:       11000011</code></div>
        </div>

        <div class="demo-explanation">
          <strong>Key Concept:</strong> Machine code is the only format the CPU understands. Each byte has a specific meaning - some are opcodes, some are operands, some are addresses. This is what actually runs on the hardware!
        </div>
      </div>
    </div>`;
    return html;
  }

  renderSymbolTable(table) {
    let result = 'Name | Type | Scope | Line\n';
    result += '-----|------|-------|-----\n';
    table.forEach((sym, name) => {
      result += `${name} | ${sym.type} | ${sym.scope} | ${sym.line}\n`;
    });
    return result;
  }

  astToString(ast, indent = 0) {
    const prefix = '  '.repeat(indent);
    if (!ast) return 'null';

    if (ast.type === 'Program') {
      return ast.statements.map(s => this.astToString(s, indent)).join('\n');
    }

    let result = prefix + (ast.type || 'Unknown');
    if (ast.name) result += ` (${ast.name})`;
    if (ast.value !== undefined) result += ` = ${ast.value}`;
    if (ast.op) result += ` [${ast.op}]`;

    if (ast.statements) {
      result += ' {\n' + ast.statements.map(s => this.astToString(s, indent + 1)).join('\n') + '\n' + prefix + '}';
    }
    if (ast.body) {
      if (Array.isArray(ast.body)) {
        result += ' {\n' + ast.body.map(s => this.astToString(s, indent + 1)).join('\n') + '\n' + prefix + '}';
      } else {
        result += ' {\n' + this.astToString(ast.body, indent + 1) + '\n' + prefix + '}';
      }
    }
    if (ast.branches) {
      result += ' [' + ast.branches.map(b => this.astToString(b, indent)).join(', ') + ']';
    }
    if (ast.left) result += '\n' + prefix + '  left: ' + this.astToString(ast.left, 0);
    if (ast.right) result += '\n' + prefix + '  right: ' + this.astToString(ast.right, 0);
    if (ast.expr) result += '\n' + prefix + '  expr: ' + this.astToString(ast.expr, 0);

    return result;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/\n/g, '\n');
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 10 — CUSTOM ERROR
═══════════════════════════════════════════════════════════════ */
class RULangError extends Error {
  constructor(message, line) {
    super(message);
    this.name   = 'RULangError';
    this.rlLine = line;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 11 — EXAMPLE PROGRAMS
═══════════════════════════════════════════════════════════════ */
const EXAMPLES = {

  hello: { filename: 'hello.ru', code:
`// hello.ru — Salam Duniya!
rakho naam = "Duniya"
likho "Salam!"
likho naam
likho "RULang v2.0 mein khush amdeed!"
` },

  conditionals: { filename: 'conditionals.ru', code:
`// conditionals.ru — agar / warna agar / warna

rakho score = 72

agar score >= 90 to
    likho "Grade: A+"
warna agar score >= 80 to
    likho "Grade: A"
warna agar score >= 70 to
    likho "Grade: B"
warna agar score >= 60 to
    likho "Grade: C"
warna
    likho "Grade: F — Phir mehnat karo!"
khatam

// Logical operators: aur / ya / nahi
rakho x = 15
agar x > 10 aur x < 20 to
    likho "x 10 aur 20 ke beech hai"
khatam

agar x < 5 ya x > 10 to
    likho "x ya 5 se kam ya 10 se zyada hai"
khatam

agar nahi (x == 0) to
    likho "x zero nahi hai"
khatam
` },

  switch_demo: { filename: 'switch.ru', code:
`// switch.ru — chunao / haalat / warna / khatam

rakho din = 3

chunao din
    haalat 1
        likho "Somwar (Monday)"
    todho
    haalat 2
        likho "Mangal (Tuesday)"
    todho
    haalat 3
        likho "Budh (Wednesday)"
    todho
    haalat 4
        likho "Jumeraat (Thursday)"
    todho
    haalat 5
        likho "Juma (Friday) — TGIF!"
    todho
    warna
        likho "Weekend — aaraam karo!"
khatam

// Switch with string
rakho mausam = "garmi"
chunao mausam
    haalat "sarma"
        likho "Coat pehno!"
    todho
    haalat "garmi"
        likho "Pankha chalaao!"
    todho
    haalat "barsaat"
        likho "Chhaata lo!"
    todho
    warna
        likho "Mausam theek hai"
khatam
` },

  for_loop: { filename: 'for_loop.ru', code:
`// for_loop.ru — gino se tak badhao karo khatam

likho "1 se 5 tak:"
gino i se 1 tak 5 karo
    likho i
khatam

likho "Ulta (10 se 1 tak):"
gino i se 10 tak 1 badhao -1 karo
    likho i
khatam

likho "Do do karke (0 se 10 tak):"
gino i se 0 tak 10 badhao 2 karo
    likho i
khatam

// Nested loops — multiplication table
likho "2 ka pahara:"
gino i se 1 tak 10 karo
    likho 2 * i
khatam

// Break in for loop
likho "5 tak phir todho:"
gino i se 1 tak 100 karo
    agar i > 5 to
        todho
    khatam
    likho i
khatam

// Continue — sirf taaq (odd) numbers
likho "Taaq numbers 1-10:"
gino i se 1 tak 10 karo
    agar i % 2 == 0 to
        agla
    khatam
    likho i
khatam
` },

  while_loop: { filename: 'while_loop.ru', code:
`// while_loop.ru — jabtak / karo / do-while

// While loop
rakho n = 1
rakho jama = 0
jabtak n <= 10 karo
    rakho jama = jama + n
    rakho n = n + 1
khatam
likho "1..10 ka jama:"
likho jama

// Do-While — pehle chalao, phir check
likho "Do-While:"
rakho x = 1
karo
    likho x
    rakho x = x + 1
jabtak x <= 5
khatam

// While with break
likho "Pehle 5 ke baad todho:"
rakho i = 0
jabtak i < 100 karo
    rakho i = i + 1
    agar i > 5 to
        todho
    khatam
    likho i
khatam

// Continue in while
likho "Juft numbers skip karke:"
rakho j = 0
jabtak j < 10 karo
    rakho j = j + 1
    agar j % 2 == 0 to
        agla
    khatam
    likho j
khatam
` },

  functions: { filename: 'functions.ru', code:
`// functions.ru — kaam … wapas … khatam

// Simple void function
kaam greet(naam)
    likho "Assalam o Alaikum, " + naam + "!"
khatam

greet("Ali")
greet("Sara")
greet("Usman")

// Function with return
kaam jama_karo(a, b)
    wapas a + b
khatam

rakho natija = jama_karo(10, 25)
likho "Jama: " + natija

// Recursive factorial
kaam factorial(n)
    agar n <= 1 to
        wapas 1
    khatam
    wapas n * factorial(n - 1)
khatam

likho "5! = " + factorial(5)
likho "10! = " + factorial(10)

// Function calling function
kaam murabaah(n)
    wapas n * n
khatam

kaam mukaab(n)
    wapas n * murabaah(n)
khatam

likho "3 ka mukaab: " + mukaab(3)
likho "4 ka mukaab: " + mukaab(4)

// Function with loop
kaam jama_tak(n)
    rakho total = 0
    gino i se 1 tak n karo
        rakho total = total + i
    khatam
    wapas total
khatam

likho "1..100 ka jama: " + jama_tak(100)
` },

  arithmetic: { filename: 'arithmetic.ru', code:
`// arithmetic.ru — Hisaab Kitaab + Built-in functions

rakho a = 20
rakho b = 6

likho "Jama: " + (a + b)
likho "Tafreeq: " + (a - b)
likho "Zarb: " + (a * b)
likho "Taqseem: " + (a / b)
likho "Baqi (Modulo): " + (a % b)

// Built-in math
likho "Girda(3.7): " + girda(3.7)
likho "Mutlaq(-9): " + mutlaq(-9)
likho "Chhat(2.1): " + chhat(2.1)
likho "Farsh(2.9): " + farsh(2.9)
likho "Quwwat(2,8): " + quwwat(2, 8)
likho "Lamba(salam): " + lamba("salam")
` },

  grade_check: { filename: 'grade_check.ru', code:
`// grade_check.ru — Functions + Switch + Loops

kaam grade(marks)
    agar marks >= 90 to
        wapas "A+"
    warna agar marks >= 80 to
        wapas "A"
    warna agar marks >= 70 to
        wapas "B"
    warna agar marks >= 60 to
        wapas "C"
    warna agar marks >= 50 to
        wapas "D"
    warna
        wapas "F"
    khatam
khatam

kaam result(marks)
    agar marks >= 50 to
        wapas "PASS"
    warna
        wapas "FAIL"
    khatam
khatam

// Test with a loop
gino i se 1 tak 5 karo
    rakho m = i * 18
    likho "Marks=" + m + "  Grade=" + grade(m) + "  " + result(m)
khatam
` },
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 12 — README CONTENT
═══════════════════════════════════════════════════════════════ */
const README_CONTENT = `# RULang v2.0 — Roman Urdu Retro Programming Language

### Nayi Features v2.0
  if/else-if/else   agar / warna agar / warna / khatam
  switch            chunao / haalat / todho / warna / khatam
  while             jabtak … karo … khatam
  do-while          karo … jabtak … [khatam]
  for loop          gino IDENT se EXPR tak EXPR [badhao EXPR] karo … khatam
  function          kaam NAAM(params) … khatam
  return            wapas [expr]
  break             todho
  continue          agla
  logical ops       aur / ya / nahi
  modulo            %
  builtins          girda, mutlaq, chhat, farsh, quwwat, jor, lamba

### Quick Syntax
  rakho x = 10
  gino i se 1 tak 5 karo
      likho i
  khatam

  jabtak x > 0 karo
      rakho x = x - 1
  khatam

  kaam add(a, b)
      wapas a + b
  khatam
  likho add(3, 4)
`;

/* ═══════════════════════════════════════════════════════════════
   SECTION 13 — IDE CONTROLLER
═══════════════════════════════════════════════════════════════ */
class IDEController {
  constructor() {
    this.editor     = document.getElementById('code-editor');
    this.lineNums   = document.getElementById('line-numbers');
    this.consoleOut = document.getElementById('console-output');
    this.symbolBody = document.getElementById('symbol-table-body');
    this.astViewer  = document.getElementById('ast-viewer');
    this.tokViewer  = document.getElementById('tokens-viewer');
    this.pyCode     = document.getElementById('python-code');
    this.statusDot  = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.editorFN   = document.getElementById('editor-filename');
    this.sbLines    = document.getElementById('sb-lines');
    this.sbChars    = document.getElementById('sb-chars');
    this.cursorPos  = document.getElementById('cursor-pos');
    this.sbTime     = document.getElementById('sb-time');

    // New layer viewers
    this.semanticContent = document.getElementById('semantic-content');
    this.irContent = document.getElementById('ir-content');
    this.optimizeContent = document.getElementById('optimize-content');
    this.targetContent = document.getElementById('target-content');
    this.emissionContent = document.getElementById('emission-content');
    this.demoContent = document.getElementById('demo-content');
    this.nfaDfaContent = document.getElementById('nfa-dfa-content');
    this.astViewContainer = document.getElementById('ast-view-container');

    this.currentASTView = 'ast'; // Track current view (ast or parse)

    this.interpreter = new Interpreter();
    this.transpiler  = new PythonTranspiler();
    this.demonstrator = new LayerDemonstrator();
    this.lastAST     = null;
    this.lastTokens  = null;

    // File system properties
    this.openedFolderHandle = null;
    this.currentFileHandle = null;

    // Layer analyzers
    this.semanticAnalyzer = null;
    this.irGenerator = null;
    this.optimizer = null;
    this.targetGenerator = null;
    this.emitter = null;

    // Store all results for demo
    this.lastSemanticResult = null;
    this.lastIRResult = null;
    this.lastOptResult = null;
    this.lastTargetResult = null;
    this.lastEmissionResult = null;

    this.init();
  }

  init() {
    this.loadExample('hello');

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('rulang-theme') || 'dark';
    this.changeTheme(savedTheme);
    document.getElementById('theme-selector').value = savedTheme;

    // Initial syntax highlighting
    this.highlightSyntax();

    document.getElementById('btn-run').addEventListener('click',    () => this.run());
    document.getElementById('btn-clear').addEventListener('click',  () => this.clearAll());
    document.getElementById('btn-python').addEventListener('click', () => this.generatePython());
    document.getElementById('btn-help').addEventListener('click',   () => this.openHelp());
    document.getElementById('close-help').addEventListener('click', () => this.closeHelp());
    document.getElementById('clear-console').addEventListener('click', () => this.clearConsole());
    document.getElementById('collapse-explorer').addEventListener('click', () => this.toggleExplorer());
    document.getElementById('copy-python').addEventListener('click', () => this.copyPython());

    // Theme selector
    document.getElementById('theme-selector').addEventListener('change', (e) => this.changeTheme(e.target.value));

    // File system event listeners
    document.getElementById('btn-open-folder').addEventListener('click', () => this.openFolder());
    document.getElementById('btn-new-file').addEventListener('click', () => this.newFile());
    document.getElementById('btn-save-file').addEventListener('click', () => this.saveFile());

    document.querySelectorAll('.file-item[data-example]').forEach(el => {
      el.addEventListener('click', () => {
        this.loadExample(el.dataset.example);
        document.querySelectorAll('.file-item').forEach(f => f.classList.remove('active'));
        el.classList.add('active');
      });
    });

    document.querySelectorAll('.file-item[data-doc]').forEach(el => {
      el.addEventListener('click', () => {
        this.editor.value = README_CONTENT;
        this.editorFN.textContent = 'README.md';
        this.onEditorChange();
      });
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    this.editor.addEventListener('input',   () => this.onEditorChange());
    this.editor.addEventListener('keydown',  e => this.onEditorKeydown(e));
    this.editor.addEventListener('keyup',    () => this.updateCursorPos());
    this.editor.addEventListener('click',    () => this.updateCursorPos());
    this.editor.addEventListener('scroll',   () => this.syncScroll());

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this.run(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l')     { e.preventDefault(); this.clearConsole(); }
      if (e.key === 'Escape') this.closeHelp();
    });

    document.getElementById('help-modal').addEventListener('click', e => {
      if (e.target.id === 'help-modal') this.closeHelp();
    });

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.onEditorChange();
    this.consoleLog('RULang v2.0 IDE tayyar hai. Ctrl+Enter dabayein. All 7 compiler layers ready!', 'system');
  }

  loadExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    this.editor.value = ex.code;
    this.editorFN.textContent = ex.filename;
    this.onEditorChange();
    this.lastAST    = null;
    this.lastTokens = null;
  }

  run() {
    const source = this.editor.value.trim();
    if (!source) { this.consoleLog('Koi code nahi! Pehle kuch likhein.', 'warn'); return; }

    this.setStatus('running', 'CHAL RAHA HAI...');
    this.clearConsole();
    this.resetPipeline();
    const t0 = performance.now();

    try {
      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: LEXICAL ANALYSIS (Tokenization)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(1, 'active');
      this.consoleLog('▶ [Layer 1/7] Lexical Analysis — Scanner chala raha hai...', 'info');
      const lexer  = new Lexer(source);
      const tokens = lexer.tokenize();
      this.lastTokens = tokens.filter(t => t.type !== TT.NEWLINE && t.type !== TT.EOF);
      this.consoleLog(`   ✓ ${this.lastTokens.length} tokens generate hue`, 'success');
      this.renderTokens(this.lastTokens);
      this.renderNfaDfa(tokens);
      this.setPipelineLayer(1, 'success');

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: SYNTAX ANALYSIS (Parsing → AST)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(2, 'active');
      this.consoleLog('▶ [Layer 2/7] Syntax Analysis — Parser AST bana raha hai...', 'info');
      const parser = new Parser(tokens);
      const ast    = parser.parse();
      this.lastAST = ast;
      const stmtCount = ast.statements.length;
      this.consoleLog(`   ✓ AST bana — ${stmtCount} statement(s)`, 'success');
      this.renderAST(ast, tokens);
      this.setPipelineLayer(2, 'success');

      // ═══════════════════════════════════════════════════════════════
      // LAYER 3: SEMANTIC ANALYSIS (Type Checking, Scope Analysis)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(3, 'active');
      this.consoleLog('▶ [Layer 3/7] Semantic Analysis — Type checking ho rahi hai...', 'info');
      this.semanticAnalyzer = new SemanticAnalyzer();
      const semanticResult = this.semanticAnalyzer.analyze(ast);
      this.lastSemanticResult = semanticResult;
      this.renderSemanticAnalysis(semanticResult);
      if (semanticResult.errors.length === 0) {
        this.consoleLog('   ✓ Semantic analysis safaal — koi errors nahi', 'success');
        this.setPipelineLayer(3, 'success');
      } else {
        this.consoleLog(`   ✗ ${semanticResult.errors.length} semantic error(s) mila`, 'error');
        this.setPipelineLayer(3, 'error');
      }

      // ═══════════════════════════════════════════════════════════════
      // LAYER 4: INTERMEDIATE CODE GENERATION (Three-Address Code)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(4, 'active');
      this.consoleLog('▶ [Layer 4/7] IR Generation — Three-Address Code bana raha hai...', 'info');
      this.irGenerator = new IRGenerator();
      const irResult = this.irGenerator.generate(ast);
      this.lastIRResult = irResult;
      this.renderIRCode(irResult);
      this.consoleLog(`   ✓ ${irResult.instructions.length} IR instruction(s) generate hue`, 'success');
      this.setPipelineLayer(4, 'success');

      // ═══════════════════════════════════════════════════════════════
      // LAYER 5: CODE OPTIMIZATION
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(5, 'active');
      this.consoleLog('▶ [Layer 5/7] Optimization — Code optimize ho raha hai...', 'info');
      this.optimizer = new Optimizer();
      const optResult = this.optimizer.optimize(irResult);
      this.lastOptResult = optResult;
      this.renderOptimization(optResult);
      this.consoleLog(`   ✓ ${optResult.stats.optimizationsApplied} optimization(s) apply hue`, 'success');
      this.setPipelineLayer(5, 'success');

      // ═══════════════════════════════════════════════════════════════
      // LAYER 6: TARGET CODE GENERATION (Assembly)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(6, 'active');
      this.consoleLog('▶ [Layer 6/7] Target Code — Assembly instructions bana raha hai...', 'info');
      this.targetGenerator = new TargetCodeGenerator();
      const targetResult = this.targetGenerator.generate(optResult.optimized);
      this.lastTargetResult = targetResult;
      this.renderTargetCode(targetResult);
      this.consoleLog(`   ✓ ${targetResult.instructions.length} assembly instruction(s)`, 'success');
      this.setPipelineLayer(6, 'success');

      // ═══════════════════════════════════════════════════════════════
      // LAYER 7: CODE EMISSION (Machine Code)
      // ═══════════════════════════════════════════════════════════════
      this.setPipelineLayer(7, 'active');
      this.consoleLog('▶ [Layer 7/7] Code Emission — Machine code output...', 'info');
      this.emitter = new CodeEmitter();
      const emissionResult = this.emitter.emit(targetResult);
      this.lastEmissionResult = emissionResult;
      this.renderEmission(emissionResult, targetResult);
      this.consoleLog(`   ✓ ${emissionResult.binary.length} machine code bytes`, 'success');
      this.setPipelineLayer(7, 'success');

      // ═══════════════════════════════════════════════════════════════
      // INTERPRETER EXECUTION (for runtime output)
      // ═══════════════════════════════════════════════════════════════
      this.consoleLog('▶ [Runtime] Interpreter execute kar raha hai...', 'info');
      const output = this.interpreter.interpret(ast);
      const ms     = (performance.now() - t0).toFixed(2);

      this.consoleLog('─'.repeat(44), 'sep');
      if (output.length === 0) this.consoleLog('(Koi output nahi mila)', 'system');
      else output.forEach(l => this.consoleLog(l, 'output'));
      this.consoleLog('─'.repeat(44), 'sep');
      this.consoleLog(`✓ Tamam 7 layers kaamyaab! ${output.length} output line(s) — ${ms}ms`, 'success');

      // Generate demonstration
      this.renderDemo(source);

      this.updateSymbolTable(this.interpreter.globalEnv.snapshot());
      this.setStatus('ready', 'TAYYAR');

    } catch (err) {
      const ms = (performance.now() - t0).toFixed(2);
      this.consoleLog('─'.repeat(44), 'sep');
      const ln = err instanceof RULangError ? ` (Line ${err.rlLine || '?'})` : '';
      this.consoleLog(`✗ GHALATI${ln}: ${err.message}`, 'error');
      this.consoleLog(`─ ${ms}ms`, 'sep');
      this.setStatus('error', 'GHALATI');
      setTimeout(() => this.setStatus('ready', 'TAYYAR'), 3000);
    }
  }

  renderDemo(source) {
    if (this.demoContent) {
      const demoHtml = this.demonstrator.generate(
        source,
        this.lastTokens,
        this.lastAST,
        this.lastSemanticResult,
        this.lastIRResult,
        this.lastOptResult,
        this.lastTargetResult,
        this.lastEmissionResult
      );
      this.demoContent.innerHTML = demoHtml;
    }
  }

  setPipelineLayer(num, state) {
    const layer = document.querySelector(`.pipeline-layer[data-layer="${num}"]`);
    if (layer) {
      layer.classList.remove('active', 'success', 'error');
      if (state) layer.classList.add(state);
    }
  }

  resetPipeline() {
    for (let i = 1; i <= 7; i++) {
      this.setPipelineLayer(i, null);
    }
  }

  generatePython() {
    const source = this.editor.value.trim();
    if (!source) { this.consoleLog('Pehle code likhein!', 'warn'); return; }
    try {
      const ast = new Parser(new Lexer(source).tokenize()).parse();
      this.pyCode.textContent = this.transpiler.transpile(ast);
      this.switchTab('python');
      this.consoleLog('✓ Python code tayyar! "PYTHON" tab dekhein.', 'success');
    } catch (err) {
      this.consoleLog(`✗ Python generate nahi ho saka: ${err.message}`, 'error');
    }
  }

  /* ── SEMANTIC ANALYSIS RENDERER ── */
  renderSemanticAnalysis(result) {
    this.semanticContent.innerHTML = result.report;
  }

  /* ── IR CODE RENDERER ── */
  renderIRCode(result) {
    this.irContent.innerHTML = result.report;
  }

  /* ── OPTIMIZATION RENDERER ── */
  renderOptimization(result) {
    this.optimizeContent.innerHTML = result.optimized.report;
  }

  /* ── TARGET CODE RENDERER ── */
  renderTargetCode(result) {
    this.targetContent.innerHTML = result.report;
  }

  /* ── EMISSION RENDERER ── */
  renderEmission(result, targetCode) {
    this.emissionContent.innerHTML = result.report;
  }

  /* ── AST RENDERING (with toggle between AST and Parse Tree) ── */
  renderAST(ast, tokens) {
    // Set up toggle handlers if not already set
    if (!this.astToggleSetup) {
      document.querySelectorAll('.ast-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.dataset.view;
          this.currentASTView = view;
          document.querySelectorAll('.ast-toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.refreshASTView();
        });
      });
      this.astToggleSetup = true;
    }

    // Store data for refresh
    this.lastASTForToggle = ast;
    this.lastTokensForToggle = tokens;
    this.refreshASTView();
  }

  refreshASTView() {
    if (!this.lastASTForToggle || !this.lastTokensForToggle) return;

    if (this.currentASTView === 'ast') {
      this.renderAbstractTree(this.lastASTForToggle);
    } else {
      this.renderParseTree(this.lastASTForToggle, this.lastTokensForToggle);
    }
  }

  renderAbstractTree(ast) {
    this.astViewContainer.innerHTML = '';
    this.astViewContainer.appendChild(this.buildASTNode(ast));
  }

  renderParseTree(ast, tokens) {
    this.astViewContainer.innerHTML = `
      <div class="parse-tree-viewer">
        <div class="parse-tree-title">Parse Tree — Hierarchical Grammar Derivations</div>
        <div class="parse-tree-content" id="parse-tree-content"></div>
      </div>
    `;
    const content = document.getElementById('parse-tree-content');
    content.appendChild(this.buildParseTreeNode(ast, tokens));
  }

  buildParseTreeNode(node, tokens, depth = 0) {
    const div = document.createElement('div');
    div.className = 'parse-node';
    div.style.marginLeft = `${depth * 20}px`;

    const line = document.createElement('div');
    line.className = 'parse-node__line';

    const rule = document.createElement('span');
    rule.className = 'parse-token';
    rule.style.cssText = 'background: var(--accent-dim); color: var(--accent-bright); padding: 2px 8px; border-radius: 3px; font-size: 11px;';
    rule.textContent = node.type;
    line.appendChild(rule);

    // Add production rule label
    const ruleLabel = document.createElement('span');
    ruleLabel.className = 'parse-node__rule';
    ruleLabel.textContent = this.getParseRuleLabel(node);
    line.appendChild(ruleLabel);

    div.appendChild(line);

    // Handle children
    const children = this.getParseTreeChildren(node);
    if (children.length > 0) {
      const childContainer = document.createElement('div');
      childContainer.className = 'parse-children';
      children.forEach(child => {
        if (typeof child === 'object' && child !== null) {
          childContainer.appendChild(this.buildParseTreeNode(child, tokens, depth + 1));
        } else {
          // Leaf node - token or value
          const leafDiv = document.createElement('div');
          leafDiv.style.marginLeft = `${(depth + 1) * 20}px`;
          leafDiv.className = 'parse-node__line';

          const leafToken = document.createElement('span');
          leafToken.className = 'parse-token';
          leafToken.textContent = JSON.stringify(child);
          leafToken.style.cssText = 'padding: 2px 8px; border-radius: 3px; font-size: 11px;';

          if (typeof child === 'number') {
            leafToken.className += ' parse-token--number';
          } else if (typeof child === 'string' && child.startsWith('"')) {
            leafToken.className += ' parse-token--string';
          } else if (typeof child === 'string') {
            leafToken.className += ' parse-token--identifier';
          }
          leafDiv.appendChild(leafToken);
          childContainer.appendChild(leafDiv);
        }
      });
      div.appendChild(childContainer);
    }

    return div;
  }

  getParseRuleLabel(node) {
    switch (node.type) {
      case 'Program': return 'Program → Statement*';
      case 'VarDecl': return 'VarDecl → RAKHO IDENT EQ Expr';
      case 'Print': return 'Print → LIKHO Expr';
      case 'If': return 'If → AGAR Expr TO Statement* (WARNA_AGAR Expr TO Statement*)* WARNA Statement* KHATAM';
      case 'Switch': return 'Switch → CHUNAO Expr (HAALAT Expr Statement* TODHO)* (WARNA Statement*)? KHATAM';
      case 'While': return 'While → JABTAK Expr KARO Statement* KHATAM';
      case 'DoWhile': return 'DoWhile → KARO Statement* JABTAK Expr KHATAM';
      case 'For': return 'For → GINO IDENT SE Expr TAK Expr (BADHAO Expr)? KAROO Statement* KHATAM';
      case 'FuncDecl': return 'FuncDecl → KAAM IDENT LPAREN (IDENT (, IDENT)*)? RPAREN Statement* KHATAM';
      case 'Return': return 'Return → WAPAS Expr?';
      case 'Break': return 'Break → TODHO';
      case 'Continue': return 'Continue → AGLA';
      case 'BinaryExpr': return `BinaryExpr → Expr ${node.op} Expr`;
      case 'UnaryExpr': return `UnaryExpr → ${node.op} Expr`;
      case 'NumberLiteral': return 'NumberLiteral → NUMBER';
      case 'StringLiteral': return 'StringLiteral → STRING';
      case 'BooleanLiteral': return 'BooleanLiteral → (SACH | JHOOTH)';
      case 'Ident': return 'Ident → IDENT';
      case 'Call': return 'Call → IDENT LPAREN (Expr (, Expr)*)? RPAREN';
      case 'ExprStmt': return 'ExprStmt → Expr';
      default: return '...';
    }
  }

  getParseTreeChildren(node) {
    const children = [];
    switch (node.type) {
      case 'Program':
        node.statements?.forEach(s => children.push(s));
        break;
      case 'VarDecl':
        children.push({ type: 'IDENT', name: node.name });
        if (node.expr) children.push(node.expr);
        break;
      case 'Print':
        if (node.exprs) node.exprs.forEach(e => children.push(e));
        break;
      case 'If':
        if (node.condition) children.push(node.condition);
        node.branches?.forEach(b => {
          if (b.condition) children.push(b.condition);
          b.body?.forEach(s => children.push(s));
        });
        if (node.elseBody) node.elseBody.forEach(s => children.push(s));
        break;
      case 'Switch':
        if (node.expr) children.push(node.expr);
        node.cases?.forEach(c => children.push(c));
        if (node.defaultBody) node.defaultBody.forEach(s => children.push(s));
        break;
      case 'While':
        if (node.condition) children.push(node.condition);
        node.body?.forEach(s => children.push(s));
        break;
      case 'DoWhile':
        node.body?.forEach(s => children.push(s));
        if (node.condition) children.push(node.condition);
        break;
      case 'For':
        children.push({ type: 'IDENT', name: node.varName });
        if (node.from) children.push(node.from);
        if (node.to) children.push(node.to);
        if (node.step) children.push(node.step);
        node.body?.forEach(s => children.push(s));
        break;
      case 'FuncDecl':
        children.push({ type: 'IDENT', name: node.name });
        node.params?.forEach(p => children.push({ type: 'IDENT', name: p }));
        node.body?.forEach(s => children.push(s));
        break;
      case 'Return':
        if (node.expr) children.push(node.expr);
        break;
      case 'BinaryExpr':
        if (node.left) children.push(node.left);
        children.push({ type: 'OPERATOR', op: node.op });
        if (node.right) children.push(node.right);
        break;
      case 'UnaryExpr':
        children.push({ type: 'OPERATOR', op: node.op });
        if (node.expr) children.push(node.expr);
        break;
      case 'Call':
        children.push({ type: 'IDENT', name: node.name });
        node.args?.forEach(a => children.push(a));
        break;
      case 'ExprStmt':
        if (node.expr) children.push(node.expr);
        break;
      default:
        // For case/switch cases
        if (node.value) children.push(node.value);
        if (node.body) node.body.forEach(s => children.push(s));
        break;
    }
    return children;
  }

  buildASTNode(node) {
    if (!node || typeof node !== 'object') {
      const s = document.createElement('span');
      s.style.cssText = 'color:var(--green-dim);font-size:11px';
      s.textContent = ' ' + JSON.stringify(node);
      return s;
    }

    const div = document.createElement('div');
    div.className = `ast-node ast-node--${(node.type||'').toLowerCase()}`;

    const label = document.createElement('div');
    label.className = 'ast-node__label';

    const labelMap = {
      Program:       n => `Program  [${n.statements.length} stmt(s)]`,
      VarDecl:       n => `VarDecl  rakho ${n.name} = …`,
      Print:         n => `Print  likho …`,
      If:            n => `If  ${n.branches.length} branch(es)${n.elseBody?' + warna':''}`,
      Switch:        n => `Switch  chunao — ${n.cases.length} haalat(s)`,
      While:         n => `While  jabtak … karo`,
      DoWhile:       n => `DoWhile  karo … jabtak`,
      For:           n => `For  gino ${n.varName} se … tak …`,
      FuncDecl:      n => `FuncDecl  kaam ${n.name}(${n.params.join(', ')})`,
      Return:        n => `Return  wapas`,
      Break:         n => `Break  todho`,
      Continue:      n => `Continue  agla`,
      BinaryExpr:    n => `BinaryExpr  [${n.op}]`,
      UnaryExpr:     n => `UnaryExpr  [${n.op}]`,
      NumberLiteral: n => `Number  ${n.value}`,
      StringLiteral: n => `String  "${n.value}"`,
      Ident:         n => `Ident  ${n.name}`,
      Call:          n => `Call  ${n.name}(${n.args.length} arg(s))`,
      ExprStmt:      n => `ExprStmt`,
    };
    label.textContent = (labelMap[node.type] || (n => n.type))(node);
    div.appendChild(label);

    const ch = document.createElement('div');
    ch.className = 'ast-children';

    const addChild = c => { if (c) ch.appendChild(this.buildASTNode(c)); };
    const addBlock = (arr, title) => {
      if (!arr?.length) return;
      const w = document.createElement('div');
      if (title) {
        const t = document.createElement('span');
        t.style.cssText = 'color:var(--amber);font-size:10px;margin-right:6px';
        t.textContent = title + ':';
        w.appendChild(t);
      }
      arr.forEach(s => w.appendChild(this.buildASTNode(s)));
      ch.appendChild(w);
    };

    switch (node.type) {
      case 'Program':    addBlock(node.statements); break;
      case 'VarDecl':    addChild(node.expr); break;
      case 'Print':      addChild(node.expr); break;
      case 'If':
        node.branches.forEach((b, i) => {
          addBlock([b.condition], i===0?'agar':'warna agar');
          addBlock(b.body, 'to');
        });
        if (node.elseBody) addBlock(node.elseBody, 'warna');
        break;
      case 'Switch':
        addChild(node.expr);
        node.cases.forEach(c => { addChild(c.value); addBlock(c.body, 'haalat'); });
        if (node.defaultBody) addBlock(node.defaultBody, 'warna');
        break;
      case 'While':    addChild(node.condition); addBlock(node.body); break;
      case 'DoWhile':  addBlock(node.body); addChild(node.condition); break;
      case 'For':      addChild(node.from); addChild(node.to); addChild(node.step); addBlock(node.body); break;
      case 'FuncDecl': addBlock(node.body); break;
      case 'Return':   if (node.expr) addChild(node.expr); break;
      case 'BinaryExpr': addChild(node.left); addChild(node.right); break;
      case 'UnaryExpr':  addChild(node.expr); break;
      case 'Call':       node.args.forEach(a => addChild(a)); break;
      case 'ExprStmt':   addChild(node.expr); break;
    }

    if (ch.children.length > 0) div.appendChild(ch);
    return div;
  }

  /* ── TOKENS TABLE ── */
  renderTokens(tokens) {
    if (!tokens?.length) return;
    const kwToks = [TT.RAKHO,TT.LIKHO,TT.AGAR,TT.WARNA_AGAR,TT.TO,TT.WARNA,TT.KHATAM,
                    TT.JABTAK,TT.KARO,TT.GINO,TT.SE,TT.TAK,TT.BADHAO,TT.CHUNAO,TT.HAALAT,
                    TT.TODHO,TT.AGLA,TT.KAAM,TT.WAPAS,TT.AND,TT.OR,TT.NOT];
    const opToks = [TT.PLUS,TT.MINUS,TT.STAR,TT.SLASH,TT.PERCENT,TT.EQ,TT.EQEQ,TT.NEQ,
                    TT.GT,TT.LT,TT.GTE,TT.LTE,TT.LPAREN,TT.RPAREN,TT.COMMA];

    const tbl = document.createElement('table');
    tbl.className = 'token-table';
    tbl.innerHTML = `<thead><tr><th>#</th><th>TYPE</th><th>VALUE</th><th>LINE</th></tr></thead>`;
    const tbody = document.createElement('tbody');

    tokens.forEach((tok, i) => {
      const cls = kwToks.includes(tok.type) ? 'tok-kw'
                : tok.type === TT.NUMBER    ? 'tok-num'
                : tok.type === TT.STRING    ? 'tok-str'
                : opToks.includes(tok.type) ? 'tok-op'
                : 'tok-id';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--text-muted)">${i+1}</td>
        <td class="tok-type">${tok.type}</td>
        <td class="${cls}">${JSON.stringify(tok.value)}</td>
        <td style="color:var(--text-muted)">${tok.line}</td>`;
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    this.tokViewer.innerHTML = '';
    this.tokViewer.appendChild(tbl);
  }

  /* ── NFA/DFA VISUALIZATION ── */
  renderNfaDfa(tokens) {
    if (!tokens?.length) return;

    const tokenTypes = {};
    tokens.forEach(t => {
      if (!tokenTypes[t.type]) tokenTypes[t.type] = [];
      tokenTypes[t.type].push(t.value);
    });

    // Build NFA/DFA visualization
    let html = `
      <div class="nfa-diagram">
        <h4 style="color: var(--accent-bright); margin-bottom: 16px;">🔄 NFA/DFA State Diagram — Token Recognition</h4>

        <div class="nfa-legend">
          <div class="nfa-legend-item start">Start State (S0)</div>
          <div class="nfa-legend-item accept">Accept State (Final)</div>
          <div class="nfa-legend-item normal">Normal State</div>
        </div>

        <div class="nfa-state-diagram" id="nfa-states">
          <div class="state-circle start">S0</div>
          <div class="transition-arrow">
            <div class="transition-line"></div>
            <div class="transition-label">peek char</div>
          </div>
          <div class="state-circle" id="state-process">S1</div>
          <div class="transition-arrow">
            <div class="transition-line"></div>
            <div class="transition-label">classify</div>
          </div>
          <div class="state-circle accept" id="state-accept">S2</div>
        </div>
      </div>

      <div class="nfa-diagram" style="margin-top: 16px;">
        <h4 style="color: var(--amber); margin-bottom: 12px;">📊 Token Type Classification</h4>
        <table class="nfa-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Pattern</th>
              <th>Token Type</th>
              <th>Example</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>`;

    const patterns = [
      { pattern: /^(rakho|likho|agar|warna|to|khatam|chunao|haalat|jabtak|karo|gino|se|tak|badhao|todho|agla|kaam|wapas|nahi)$/i, type: 'KEYWORD', examples: ['rakho', 'likho', 'agar'], action: 'Check keyword table' },
      { pattern: /^_?[a-zA-Z][a-zA-Z0-9_]*$/, type: 'IDENTIFIER', examples: ['x', 'count', 'myVar_1'], action: 'Register in symbol table' },
      { pattern: /^-?\d+(\.\d+)?$/, type: 'NUMBER', examples: ['42', '3.14', '-7'], action: 'Parse numeric value' },
      { pattern: /^"[^"]*"$/, type: 'STRING', examples: ['"hello"', '"test"'], action: 'Store string value' },
      { pattern: /^[\+\-\*\/\=\<\>]+$/, type: 'OPERATOR', examples: ['+', '==', '<=', '!='], action: 'Map to token type' },
      { pattern: /^[\(\)\[\]\{\}\,]$/, type: 'DELIMITER', examples: ['(', ')', ',', ';'], action: 'Return as-is' },
    ];

    patterns.forEach((p, i) => {
      const sampleToken = tokens.find(t => p.pattern.test(String(t.value || '')));
      html += `
        <tr>
          <td><strong>S${i}</strong></td>
          <td style="font-family: var(--font-mono)">${p.pattern.toString()}</td>
          <td class="tok-type">${p.type}</td>
          <td style="font-family: var(--font-mono); color: var(--text-secondary)">${p.examples.join(', ')}</td>
          <td style="font-size: 10px">${p.action}</td>
        </tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>

      <div class="nfa-diagram" style="margin-top: 16px;">
        <h4 style="color: var(--green); margin-bottom: 12px;">✅ Scanned Tokens Summary</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;

    const seenTypes = new Set();
    tokens.forEach(t => {
      if (seenTypes.has(t.type)) return;
      seenTypes.add(t.type);
      const color = t.type.includes('RAKHO') || t.type.includes('LIKHO') || t.type.includes('AGAR') ? 'var(--purple)' :
                    t.type === 'NUMBER' ? 'var(--cyan)' :
                    t.type === 'STRING' ? 'var(--green)' :
                    t.type === 'IDENT' ? 'var(--accent-bright)' : 'var(--amber)';
      html += `<span style="padding: 4px 10px; background: ${color}22; color: ${color}; border-radius: 4px; font-size: 11px; font-family: var(--font-mono);">${t.type}</span>`;
    });

    html += `
        </div>
      </div>
    `;

    this.nfaDfaContent.innerHTML = html;
  }

  /* ── SYMBOL TABLE ── */
  updateSymbolTable(snap) {
    this.symbolBody.innerHTML = '';
    if (snap.size === 0) {
      this.symbolBody.innerHTML = '<tr class="empty-row"><td colspan="3">Koi variable nahi</td></tr>';
      return;
    }
    snap.forEach((value, name) => {
      const isFn = value && value.__type__ === 'RULangFunction';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:${isFn?'var(--amber)':'var(--text-primary)'}">${name}</td>
        <td style="color:${isFn?'var(--amber)':'var(--cyan)'}">${isFn?'[kaam]':JSON.stringify(value)}</td>
        <td style="color:var(--text-dim)">${isFn?'function':typeof value}</td>`;
      this.symbolBody.appendChild(tr);
    });
  }

  /* ── CONSOLE ── */
  consoleLog(msg, type = 'output') {
    const el = document.createElement('div');
    el.className = `console-line console-line--${type}`;
    if (type === 'output')
      el.innerHTML = `<span class="console-prompt">▸ </span>${this.esc(msg)}`;
    else
      el.textContent = msg;
    this.consoleOut.appendChild(el);
    this.consoleOut.scrollTop = this.consoleOut.scrollHeight;
  }

  clearConsole() { this.consoleOut.innerHTML = ''; }

  clearAll() {
    this.clearConsole();
    this.editor.value = '';
    this.onEditorChange();
    this.symbolBody.innerHTML = '<tr class="empty-row"><td colspan="3">Koi variable nahi</td></tr>';
    this.astViewContainer.innerHTML  = `<div class="empty-state"><div class="empty-state__icon">🌳</div><div>Program chalayein AST dekhne ke liye</div></div>`;
    this.tokViewer.innerHTML  = `<div class="empty-state"><div class="empty-state__icon">🔤</div><div>Program chalayein tokens dekhne ke liye</div></div>`;

    // Reset layer views
    if (this.nfaDfaContent) this.nfaDfaContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔄</div><div>Program chalayein NFA/DFA dekhne ke liye</div></div>`;
    if (this.semanticContent) this.semanticContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><div>Program chalayein semantic analysis dekhne ke liye</div></div>`;
    if (this.irContent) this.irContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📝</div><div>Program chalayein IR code dekhne ke liye</div></div>`;
    if (this.optimizeContent) this.optimizeContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚡</div><div>Program chalayein optimization dekhne ke liye</div></div>`;
    if (this.targetContent) this.targetContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎯</div><div>Program chalayein target code dekhne ke liye</div></div>`;
    if (this.emissionContent) this.emissionContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📤</div><div>Program chalayein final code dekhne ke liye</div></div>`;
    if (this.demoContent) this.demoContent.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎓</div><div>Program chalayein demonstration dekhne ke liye</div></div>`;

    // Reset pipeline visualization
    this.resetPipeline();

    this.consoleLog('Saaf ho gaya! All 7 compiler layers reset.', 'system');
  }

  esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  switchTab(name) {
    document.querySelectorAll('.tab').forEach(t         => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(c  => c.classList.toggle('active', c.id === `tab-${name}`));
  }

  setStatus(s, t) { this.statusDot.className = `status-dot ${s}`; this.statusText.textContent = t; }

  onEditorChange() {
    const lines = this.editor.value.split('\n');
    this.lineNums.textContent = lines.map((_,i) => i+1).join('\n');
    this.sbLines.textContent  = `${lines.length} line${lines.length!==1?'s':''}`;
    this.sbChars.textContent  = `${this.editor.value.length} chars`;
    // Highlight syntax
    this.highlightSyntax();
  }

  onEditorKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = this.editor.selectionStart, end = this.editor.selectionEnd;
      this.editor.value = this.editor.value.substring(0,s) + '    ' + this.editor.value.substring(end);
      this.editor.selectionStart = this.editor.selectionEnd = s + 4;
      this.onEditorChange();
    }
  }

  updateCursorPos() {
    const before = this.editor.value.substring(0, this.editor.selectionStart).split('\n');
    this.cursorPos.textContent = `Ln ${before.length}, Col ${before[before.length-1].length+1}`;
  }

  syncScroll() {
    this.lineNums.scrollTop = this.editor.scrollTop;
    // Sync syntax highlight scroll
    const highlightEl = document.getElementById('syntax-highlight');
    if (highlightEl) {
      highlightEl.scrollTop = this.editor.scrollTop;
      highlightEl.scrollLeft = this.editor.scrollLeft;
    }
  }

  toggleExplorer() {
    const p = document.querySelector('.panel--explorer');
    p.classList.toggle('collapsed');
    document.getElementById('collapse-explorer').textContent = p.classList.contains('collapsed') ? '▶' : '◀';
  }

  copyPython() {
    navigator.clipboard.writeText(this.pyCode.textContent)
      .then(() => this.consoleLog('✓ Python code copy ho gaya!', 'success'))
      .catch(() => this.consoleLog('Copy nahi ho saka.', 'warn'));
  }

  openHelp()  { document.getElementById('help-modal').classList.add('open'); }
  closeHelp() { document.getElementById('help-modal').classList.remove('open'); }
  updateClock() { this.sbTime.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); }

  // Theme switching
  changeTheme(themeName) {
    // Remove all theme classes
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-monokai', 'theme-github', 'theme-dracula');
    // Add the selected theme (default to dark if not specified)
    const themeClass = themeName ? `theme-${themeName}` : 'theme-dark';
    document.body.classList.add(themeClass);
    // Save theme preference
    localStorage.setItem('rulang-theme', themeName || 'dark');
    this.consoleLog(`✓ Theme changed to ${themeName || 'dark'}`, 'success');
    // Re-highlight code
    this.highlightSyntax();
  }

  // Syntax highlighting
  highlightSyntax() {
    const code = this.editor.value;
    if (!code.trim()) return;

    try {
      // Tokenize the code
      const tokens = new Lexer(code).tokenize();
      let highlighted = '';
      let lastIndex = 0;

      tokens.forEach(token => {
        // EOF token usually has same start/end, or value null
        if (token.type === TT.EOF) return;

        // Add plain text before token (whitespace, etc.)
        if (token.start > lastIndex) {
          highlighted += this.escapeHtml(code.substring(lastIndex, token.start));
        }

        // Add highlighted token using exact source text
        const className = this.getTokenClass(token.type);
        const tokenText = code.substring(token.start, token.end);
        highlighted += `<span class="${className}">${this.escapeHtml(tokenText)}</span>`;

        lastIndex = token.end;
      });

      // Add remaining text
      if (lastIndex < code.length) {
        highlighted += this.escapeHtml(code.substring(lastIndex));
      }

      // Update the highlighted display (we'll add this to HTML)
      const highlightEl = document.getElementById('syntax-highlight');
      if (highlightEl) {
        highlightEl.innerHTML = highlighted;
      }
    } catch (err) {
      // If parsing fails, just escape the text
      const highlightEl = document.getElementById('syntax-highlight');
      if (highlightEl) {
        highlightEl.innerHTML = this.escapeHtml(code);
      }
    }
  }

  getTokenClass(tokenType) {
    const classMap = {
      [TT.RAKHO]: 'syntax-keyword',
      [TT.LIKHO]: 'syntax-keyword',
      [TT.AGAR]: 'syntax-keyword',
      [TT.WARNA_AGAR]: 'syntax-keyword',
      [TT.TO]: 'syntax-keyword',
      [TT.WARNA]: 'syntax-keyword',
      [TT.KHATAM]: 'syntax-keyword',
      [TT.JABTAK]: 'syntax-keyword',
      [TT.KARO]: 'syntax-keyword',
      [TT.GINO]: 'syntax-keyword',
      [TT.CHALAO]: 'syntax-keyword',
      [TT.SE]: 'syntax-keyword',
      [TT.TAK]: 'syntax-keyword',
      [TT.BADHAO]: 'syntax-keyword',
      [TT.CHUNAO]: 'syntax-keyword',
      [TT.HAALAT]: 'syntax-keyword',
      [TT.TODHO]: 'syntax-keyword',
      [TT.AGLA]: 'syntax-keyword',
      [TT.KAAM]: 'syntax-keyword',
      [TT.WAPAS]: 'syntax-keyword',
      [TT.AND]: 'syntax-keyword',
      [TT.OR]: 'syntax-keyword',
      [TT.NOT]: 'syntax-keyword',
      [TT.IDENT]: 'syntax-variable',
      [TT.NUMBER]: 'syntax-number',
      [TT.STRING]: 'syntax-string',
      [TT.COMMENT]: 'syntax-comment',
      [TT.PLUS]: 'syntax-operator',
      [TT.MINUS]: 'syntax-operator',
      [TT.STAR]: 'syntax-operator',
      [TT.SLASH]: 'syntax-operator',
      [TT.PERCENT]: 'syntax-operator',
      [TT.EQ]: 'syntax-operator',
      [TT.EQEQ]: 'syntax-operator',
      [TT.NEQ]: 'syntax-operator',
      [TT.GT]: 'syntax-operator',
      [TT.LT]: 'syntax-operator',
      [TT.GTE]: 'syntax-operator',
      [TT.LTE]: 'syntax-operator',
      [TT.LPAREN]: 'syntax-operator',
      [TT.RPAREN]: 'syntax-operator',
      [TT.COMMA]: 'syntax-operator'
    };
    return classMap[tokenType] || 'syntax-identifier';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // File system methods
  async openFolder() {
    if (!window.showDirectoryPicker) {
      this.consoleLog('✗ Aapka browser file system access support nahi karta. Chrome, Edge, or Opera use karein.', 'error');
      return;
    }

    try {
      this.openedFolderHandle = await window.showDirectoryPicker();
      this.displayOpenedFolder();
      this.consoleLog('✓ Folder khol diya!', 'success');
    } catch (err) {
      this.consoleLog('✗ Folder kholne mein error: ' + err.message, 'error');
    }
  }

  async displayOpenedFolder() {
    if (!this.openedFolderHandle) return;

    const folderGroup = document.getElementById('opened-folder-group');
    const folderLabel = document.getElementById('opened-folder-label');
    const openedFiles = document.getElementById('opened-files');

    folderLabel.textContent = `📂 ${this.openedFolderHandle.name}/`;
    openedFiles.innerHTML = '';

    // Request read permission first (while user activation is active)
    try {
      if (await this.openedFolderHandle.requestPermission({ mode: 'read' }) !== 'granted') {
        this.consoleLog('✗ Permission denied for reading folder contents', 'error');
        return;
      }
    } catch (err) {
      this.consoleLog('✗ Permission request failed: ' + err.message, 'error');
      return;
    }

    try {
      for await (const [name, handle] of this.openedFolderHandle.entries()) {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `<span class="file-icon">${handle.kind === 'file' ? '📄' : '📁'}</span> ${name}`;
        li.addEventListener('click', () => this.loadFile(handle));
        openedFiles.appendChild(li);
      }

      folderGroup.style.display = 'block';
    } catch (err) {
      this.consoleLog('✗ Folder contents load nahi ho sake: ' + err.message, 'error');
    }
  }

  async loadFile(handle) {
    if (handle.kind !== 'file') return;

    // Request read permission first (while user activation is active)
    try {
      if (await this.openedFolderHandle.requestPermission({ mode: 'read' }) !== 'granted') {
        this.consoleLog('✗ Permission denied for reading from folder', 'error');
        return;
      }
    } catch (err) {
      this.consoleLog('✗ Permission request failed: ' + err.message, 'error');
      return;
    }

    try {
      const file = await handle.getFile();
      const content = await file.text();
      this.editor.value = content;
      this.editorFN.textContent = handle.name;
      this.currentFileHandle = handle;
      this.onEditorChange();
      this.consoleLog(`✓ File "${handle.name}" load ho gayi!`, 'success');
    } catch (err) {
      this.consoleLog('✗ File load nahi ho saki: ' + err.message, 'error');
    }
  }

  async newFile() {
    if (!this.openedFolderHandle) {
      this.consoleLog('Pehle folder kholo!', 'warn');
      return;
    }

    // Request write permission first (while user activation is active)
    try {
      if (await this.openedFolderHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
        this.consoleLog('✗ Permission denied for writing to folder', 'error');
        return;
      }
    } catch (err) {
      this.consoleLog('✗ Permission request failed: ' + err.message, 'error');
      return;
    }

    const fileName = prompt('Nayi file ka naam (e.g., question1.ru):');
    if (!fileName) return;

    // Auto-append .ru if no extension provided
    const finalName = fileName.includes('.') ? fileName : fileName + '.ru';

    try {
      this.currentFileHandle = await this.openedFolderHandle.getFileHandle(finalName, { create: true });
      this.editor.value = '';
      this.editorFN.textContent = finalName;
      this.onEditorChange();
      this.displayOpenedFolder(); // Refresh the list
      this.consoleLog(`✓ Nayi file "${finalName}" banayi!`, 'success');
    } catch (err) {
      this.consoleLog('✗ File banane mein error: ' + err.message, 'error');
    }
  }

  async saveFile() {
    if (!this.currentFileHandle) {
      this.consoleLog('Pehle file kholo ya banao!', 'warn');
      return;
    }

    // Request write permission first (while user activation is active)
    try {
      if (await this.openedFolderHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
        this.consoleLog('✗ Permission denied for writing to folder', 'error');
        return;
      }
    } catch (err) {
      this.consoleLog('✗ Permission request failed: ' + err.message, 'error');
      return;
    }

    try {
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(this.editor.value);
      await writable.close();
      this.consoleLog(`✓ File "${this.currentFileHandle.name}" save ho gayi!`, 'success');
    } catch (err) {
      this.consoleLog('✗ File save nahi ho saki: ' + err.message, 'error');
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 14 — BOOT
═══════════════════════════════════════════════════════════════ */
function initIDE() {
  try {
    window.IDE = new IDEController();
    console.log('RULang IDE initialized successfully');
  } catch (e) {
    console.error('Failed to initialize IDE:', e);
    alert('Failed to initialize IDE. Check console for errors.');
  }
}

// Initialize immediately if DOM is ready, or wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIDE);
} else {
  initIDE();
}