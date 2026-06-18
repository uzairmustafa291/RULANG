# RULang v2.0 — Roman Urdu Retro Programming Language

> *"Jab programming Urdu mein baat kare!"*

A browser-based retro IDE and interpreter for **RULang** — a mini programming language with Roman Urdu keywords. Built as a Compiler Construction course project demonstrating all **7 phases of compilation**.

---

## 7 Layers of Compiler Construction

```
Source Code (Roman Urdu)
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 1: LEXICAL ANALYSIS               │
│ Lexer → Token Stream                    │
│ "rakho x = 10" → [RAKHO, IDENT, EQ, 10]  │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 2: SYNTAX ANALYSIS                │
│ Parser → Abstract Syntax Tree (AST)     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 3: SEMANTIC ANALYSIS               │
│ Type Checking, Scope Analysis           │
│ Symbol Table Construction               │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 4: IR GENERATION                  │
│ Three-Address Code (TAC)               │
│ MOV t0, 10 → STORE x, t0               │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 5: OPTIMIZATION                   │
│ Constant Folding, Dead Code Elim.     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 6: TARGET CODE GENERATION         │
│ x86 Assembly Instructions              │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Layer 7: CODE EMISSION                  │
│ Machine Code (Hex/Binary)              │
└─────────────────────────────────────────┘
```

---

## Quick Start

1. Open `index.html` in any modern browser
2. Write RULang code or load an example
3. Press **CHALAO** (Ctrl+Enter) to run
4. Click **7 DEMO** tab to see all 7 layers in action

---

## Complete Language Reference

### Variables

```rulang
rakho x = 10              // Number
rakho naam = "Ali"         // String
rakho flag = sach          // Boolean (sach=true, jhooth=false)
```

### Output

```rulang
likho "Salam Duniya!"      // Print string
likho x                   // Print variable
likho "Value: " + x       // Concatenation
```

### Conditionals

```rulang
// Simple if
agar x > 5 to
    likho "Bara hai"
khatam

// if-else if-else
agar x > 10 to
    likho "Bohat bada"
warna agar x == 5 to
    likho "Barabar"
warna
    likho "Chota"
khatam
```

### Switch/Case

```rulang
chunao din
    haalat 1
        likho "Somwar"
        todho            // Break ( IMPORTANT! )
    haalat 2
        likho "Mangal"
        todho
    warna               // Default
        likho "Aur din"
khatam
```

### Loops

```rulang
// While loop
jabtak x < 10 karo
    likho x
    rakho x = x + 1
khatam

// Do-while
karo
    likho x
    rakho x = x + 1
jabtak x < 5
khatam

// For loop (1 to 10)
gino i se 1 tak 10 karo
    likho i
khatam

// For reverse (10 to 1)
gino i se 10 tak 1 badhao -1 karo
    likho i
khatam

// For with step (0, 2, 4, 6, 8, 10)
gino i se 0 tak 10 badhao 2 karo
    likho i
khatam
```

### Functions

```rulang
// Function declaration
kaam jama(a, b)
    wapas a + b
khatam

// Recursive function
kaam factorial(n)
    agar n <= 1 to
        wapas 1
    khatam
    wapas n * factorial(n - 1)
khatam

// Function call
likho jama(5, 3)           // Output: 8
likho factorial(5)         // Output: 120
```

### Break & Continue

```rulang
jabtak x < 100 karo
    agar x == 50 to
        todho           // Exit loop
    khatam
    likho x
khatam

jabtak i < 10 karo
    rakho i = i + 1
    agar i % 2 == 0 to
        agla            // Next iteration
    khatam
    likho i            // Only odd numbers
khatam
```

### Logical Operators

```rulang
agar x > 5 aur x < 10 to    // AND (&&)
    likho "In range"
khatam

agar x < 5 ya x > 10 to    // OR (||)
    likho "Out of range"
khatam

agar nahi (x == 0) to       // NOT (!)
    likho "Not zero"
khatam
```

---

## Arithmetic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `x + y` |
| `-` | Subtraction | `x - y` |
| `*` | Multiplication | `x * y` |
| `/` | Division | `x / y` |
| `%` | Modulo | `x % y` |

---

## Comparison Operators

| Operator | Description |
|----------|-------------|
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `==` | Equal |
| `!=` | Not equal |

---

## Built-in Functions

```rulang
likho girda(3.7)     // Round: 4
likho mutlaq(-5)      // Absolute: 5
likho chhat(2.1)      // Ceiling: 3
likho farsh(2.9)      // Floor: 2
likho quwwat(2, 8)    // Power: 256
likho lamba("Salam")  // String length: 6
likho toStr(123)      // To string: "123"
likho toNum("456")    // To number: 456
```

---

## Keyword Reference

| Keyword | English | Usage |
|---------|---------|-------|
| `rakho` | put/place | Variable declaration |
| `likho` | write | Print output |
| `agar` | if | If condition |
| `to` | then | Part of if statement |
| `warna agar` | else if | Else if condition |
| `warna` | else | Else block |
| `khatam` | finished | End block |
| `chunao` | choose | Switch statement |
| `haalat` | case | Switch case |
| `jabtak` | as long as | While loop |
| `karo` | do | Do-while / loop body |
| `gino` | count | For loop |
| `se` | from | Range start |
| `tak` | to/until | Range end |
| `badhao` | increase | Step/increment |
| `kaam` | work | Function definition |
| `wapas` | return | Return value |
| `todho` | break | Break loop |
| `agla` | next | Continue loop |
| `aur` | and | Logical AND |
| `ya` | or | Logical OR |
| `nahi` | not | Logical NOT |
| `sach` | true | Boolean true |
| `jhooth` | false | Boolean false |

---

## IDE Features

- **7 Layer Pipeline Visualization** - See all compilation phases in action
- **File Explorer** - Load example programs
- **Multi-tab Interface**:
  - `EDITOR` - Write code
  - `TOKENS` - Token stream viewer
  - `AST DARAKHT` - Syntax tree visualization
  - `SEMANTIC` - Type checking & symbol table
  - `IR CODE` - Three-Address Code
  - `OPTIMIZE` - Optimization results
  - `TARGET` - Assembly output
  - `EMISSION` - Machine code
  - `PYTHON` - Generated Python code
  - `7 DEMO` - Step-by-step explanation
- **Pipeline Progress** - Visual indicator showing current compilation layer
- **Symbol Table** - Live variable tracking
- **Keyboard Shortcuts**:
  - `Ctrl+Enter` - Run program
  - `Ctrl+L` - Clear console
  - `Tab` - Indent
  - `Escape` - Close help

---

## Project Structure

```
RULang/
├── index.html       ← Main IDE (single-page application)
├── style.css        ← Styling with dark theme
├── script.js        ← Full compiler implementation
│                    ← Lexer, Parser, SemanticAnalyzer
│                    ← IRGenerator, Optimizer
│                    ← TargetCodeGenerator, CodeEmitter
│                    ← LayerDemonstrator
└── README.md        ← This file
```

---

## Example Programs

### Hello World
```rulang
rakho naam = "Duniya"
likho "Salam!"
likho naam
```

### Factorial
```rulang
kaam factorial(n)
    agar n <= 1 to
        wapas 1
    khatam
    wapas n * factorial(n - 1)
khatam

likho factorial(5)  // Output: 120
```

### Grade Checker
```rulang
kaam grade(marks)
    agar marks >= 90 to
        wapas "A+"
    warna agar marks >= 80 to
        wapas "A"
    warna
        wapas "F"
    khatam
khatam

likho grade(85)  // Output: A
```

---

## Technical Details

- **Pure JavaScript** - No dependencies, no build step
- **ES6+ Classes** - Clean OOP architecture
- **Works offline** - After initial font load
- **Browser compatible** - Chrome, Firefox, Safari, Edge

---

## Educational Value

This project demonstrates:

1. **Lexical Analysis** - Finite automaton tokenization
2. **Syntax Analysis** - Recursive descent parsing
3. **Semantic Analysis** - Type inference and scope tracking
4. **IR Generation** - Three-Address Code production
5. **Optimization** - Constant folding, dead code elimination
6. **Code Generation** - Assembly instruction mapping
7. **Code Emission** - Machine code output

---

*RULang — Compiler Construction Project | Roman Urdu Programming Language*
