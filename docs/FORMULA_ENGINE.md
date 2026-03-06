# Formula Engine Documentation

## Overview

The Formula Engine provides Excel-like formula support for calculated columns in Report Tables. It supports cell references, mathematical operations, and a wide range of built-in functions.

**Location:** `frontend/src/lib/formulaEngine.ts`

---

## Quick Start

### Basic Usage

```typescript
import { FormulaEngine } from '@/lib/formulaEngine';

// Evaluate a simple formula
const result = FormulaEngine.evaluate('=1+2', {});
console.log(result.value); // 3

// With cell references
const context = {
  A1: 10,
  B1: 20,
};
const result = FormulaEngine.evaluate('=A1+B1', context);
console.log(result.value); // 30

// Using functions
const result = FormulaEngine.evaluate('=SUM(A1:A3)', {
  A1: 10,
  A2: 20,
  A3: 30,
});
console.log(result.value); // 60
```

### Monitored Usage (with Performance Tracking)

```typescript
import { MonitoredFormulaEngine, useFormulaPerformance } from '@/lib/formulaEnginePerformance';

// Evaluate with automatic performance tracking
const result = MonitoredFormulaEngine.evaluate('=SUM(A1:A10)', context);

// React hook for monitoring
function MyComponent() {
  const { metrics, getSlowFormulas } = useFormulaPerformance();
  
  return (
    <div>
      <p>Average execution time: {metrics.averageDuration}ms</p>
    </div>
  );
}
```

---

## Formula Syntax

### Basic Rules

1. **Formula Prefix:** All formulas must start with `=`
2. **Cell References:** Use `A1`, `B2`, `C3` notation (column letter + row number)
3. **Case Insensitive:** `SUM` and `sum` are equivalent
4. **Decimal Separator:** Use `.` (e.g., `3.14`)

### Cell References

| Reference | Description | Example |
|-----------|-------------|---------|
| `A1` | Relative reference | `=A1+B1` |
| `$A$1` | Absolute reference | `=$A$1+B1` |
| `A1:B10` | Range reference | `=SUM(A1:B10)` |

### Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `=5+3` | 8 |
| `-` | Subtraction | `=10-4` | 6 |
| `*` | Multiplication | `=6*7` | 42 |
| `/` | Division | `=20/4` | 5 |
| `^` | Power | `=2^3` | 8 |
| `=` | Equal | `=A1=5` | true/false |
| `<>` | Not equal | `=A1<>5` | true/false |
| `<` | Less than | `=A1<10` | true/false |
| `>` | Greater than | `=A1>10` | true/false |
| `<=` | Less or equal | `=A1<=10` | true/false |
| `>=` | Greater or equal | `=A1>=10` | true/false |
| `&` | Concatenation | `="Hello"&" "&"World"` | "Hello World" |

---

## Mathematical Functions

### SUM
Adds all numbers in a range.

```excel
=SUM(A1:A10)
=SUM(A1, B1, C1)
=SUM(A1:A5, B1:B5)
```

### AVERAGE
Calculates the average of a range.

```excel
=AVERAGE(A1:A10)
=AVERAGE(B1, B2, B3)
```

### COUNT
Counts cells containing numbers.

```excel
=COUNT(A1:A10)
```

### MIN / MAX
Returns the minimum or maximum value.

```excel
=MIN(A1:A10)
=MAX(A1:A10)
```

### ROUND
Rounds a number to specified decimal places.

```excel
=ROUND(3.14159, 2)      // Result: 3.14
=ROUND(123.456, 0)      // Result: 123
=ROUND(1234.567, -1)    // Result: 1230
```

### ABS
Returns the absolute value.

```excel
=ABS(-10)    // Result: 10
=ABS(10)     // Result: 10
```

### POWER
Raises a number to a power.

```excel
=POWER(2, 3)     // Result: 8
=POWER(10, 2)    // Result: 100
```

### SQRT
Returns the square root.

```excel
=SQRT(16)    // Result: 4
=SQRT(2)     // Result: 1.414...
```

### MOD
Returns the remainder of division.

```excel
=MOD(17, 5)     // Result: 2
=MOD(10, 3)     // Result: 1
```

---

## Logical Functions

### IF
Conditional logic.

```excel
=IF(A1>100, "Yüksək", "Aşağı")
=IF(AND(A1>0, B1>0), "Müsbət", "Mənfi")
=IF(A1>B1, A1-B1, 0)
```

### AND
Returns true if all conditions are true.

```excel
=AND(A1>0, B1>0, C1>0)
=AND(A1>=60, A1<=100)
```

### OR
Returns true if any condition is true.

```excel
=OR(A1="A", A1="B", A1="C")
=OR(A1<0, A1>100)
```

### NOT
Reverses a logical value.

```excel
=NOT(A1=TRUE)
=NOT(ISBLANK(A1))
```

### TRUE / FALSE
Returns boolean values.

```excel
=TRUE()     // Result: true
=FALSE()    // Result: false
```

### IFERROR
Returns value if no error, otherwise returns alternative.

```excel
=IFERROR(A1/B1, 0)
=IFERROR(VLOOKUP(A1, B1:C10, 2), "Tapılmadı")
```

---

## Text Functions

### CONCAT / CONCATENATE
Joins text strings.

```excel
=CONCAT(A1, " ", B1)
=CONCATENATE("Məktəb: ", A1)
="Məktəb: "&A1    // Using & operator
```

### LEFT
Extracts characters from the start.

```excel
=LEFT(A1, 3)      // First 3 characters
=LEFT("Hello", 2) // "He"
```

### RIGHT
Extracts characters from the end.

```excel
=RIGHT(A1, 3)       // Last 3 characters
=RIGHT("Hello", 2)  // "lo"
```

### MID
Extracts characters from the middle.

```excel
=MID(A1, 2, 3)      // Start at position 2, take 3 characters
=MID("Hello", 2, 2) // "el"
```

### LEN
Returns the length of text.

```excel
=LEN(A1)
=LEN("Hello")    // Result: 5
```

### UPPER / LOWER / TRIM
Text case and whitespace operations.

```excel
=UPPER(A1)       // "hello" → "HELLO"
=LOWER(A1)       // "HELLO" → "hello"
=TRIM(A1)        // Removes extra spaces
```

### SUBSTITUTE
Replaces text.

```excel
=SUBSTITUTE(A1, "old", "new")
=SUBSTITUTE("Hello World", "World", "Universe")
```

---

## Date Functions

### TODAY
Returns today's date.

```excel
=TODAY()          // Returns: "2026-03-01"
```

### NOW
Returns current date and time.

```excel
=NOW()           // Returns: "2026-03-01T14:30:00.000Z"
```

### YEAR / MONTH / DAY
Extract date components.

```excel
=YEAR(A1)        // 2026
=MONTH(A1)       // 3
=DAY(A1)         // 1
```

### DATEDIF
Calculates difference between dates.

```excel
=DATEDIF(A1, B1, "D")     // Days difference
=DATEDIF(A1, B1, "M")     // Months difference
=DATEDIF(A1, B1, "Y")     // Years difference
```

---

## Advanced Examples

### Grade Calculation

```excel
// Calculate average with weighting
=ROUND((A1*0.3 + B1*0.3 + C1*0.4), 2)

// Pass/Fail determination
=IF(AVERAGE(A1:C1)>=60, "Keçdi", "Qaldı")
```

### Statistical Analysis

```excel
// Standard deviation approximation
=SQRT(AVERAGE((A1:A10-AVERAGE(A1:A10))^2))

// Percentage calculation
=ROUND((A1/MAX($A$1:$A$100))*100, 1)
```

### Data Validation

```excel
// Check if value is within range
=IF(AND(A1>=0, A1<=100), "Keçərli", "Keçərsiz")

// Check for empty cells
=IF(OR(ISBLANK(A1), ISBLANK(B1)), "Tamamlanmayıb", "Tamamlandı")
```

### Conditional Summation

```excel
// Sum only positive values
=SUMIF(A1:A10, ">0")

// Sum with condition
=IF(A1>50, SUM(B1:B10), 0)
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `#REF!` | Invalid cell reference | Check cell reference format |
| `#DIV/0!` | Division by zero | Use IFERROR: `=IFERROR(A1/B1,0)` |
| `#VALUE!` | Invalid value type | Check data types |
| `#NAME?` | Unknown function | Check function spelling |
| `#N/A` | Value not available | Check cell values |

### Error Prevention

```typescript
// Always check result
const result = FormulaEngine.evaluate('=A1/B1', context);
if (result.error) {
  console.error('Formula error:', result.error);
} else {
  console.log('Result:', result.value);
}

// Use IFERROR for safe division
const safeResult = FormulaEngine.evaluate(
  '=IFERROR(A1/B1, 0)',
  { A1: 10, B1: 0 }
);
// Result: 0 (not error)
```

---

## Performance Best Practices

### 1. Avoid Deep Nesting

```excel
// Bad - Deep nesting
=IF(A1>0, IF(A1<10, IF(A1<5, "A", "B"), "C"), "D")

// Better - Flatten logic
=IF(A1<=0, "D", IF(A1>=10, "C", IF(A1<5, "A", "B")))
```

### 2. Minimize Range Sizes

```excel
// Bad - Large ranges
=SUM(A1:A10000)

// Better - Specific ranges
=SUM(A1:A100)
```

### 3. Cache Repeated Calculations

```typescript
// Calculate once, reuse
const avg = FormulaEngine.evaluate('=AVERAGE(A1:A10)', context).value;
const stdDev = FormulaEngine.evaluate(
  '=SQRT(AVERAGE((A1:A10-' + avg + ')^2))',
  context
);
```

### 4. Use Performance Monitoring

```typescript
import { FormulaPerformanceDashboard } from '@/lib/formulaEnginePerformance';

// Add to your admin panel
<FormulaPerformanceDashboard />
```

---

## Integration with Report Tables

### Column Definition

```typescript
const column = {
  key: 'total_score',
  label: 'Ümumi bal',
  type: 'calculated',
  formula: '=SUM(A1:E1)',
  format: 'number',
  decimals: 2,
};
```

### Dynamic Context Building

```typescript
function buildContext(rowData: Record<string, any>, rowIndex: number) {
  const context: CellContext = {};
  
  // Map row data to cell references
  Object.keys(rowData).forEach((key, colIndex) => {
    const colRef = String.fromCharCode(65 + colIndex); // A, B, C...
    const cellRef = `${colRef}${rowIndex + 1}`;
    context[cellRef] = rowData[key];
  });
  
  return context;
}
```

### Real-time Calculation

```typescript
// In your component
const [calculatedValue, setCalculatedValue] = useState(null);

useEffect(() => {
  const context = buildContext(rowData, rowIndex);
  const result = FormulaEngine.evaluate(column.formula, context);
  
  if (!result.error) {
    setCalculatedValue(result.value);
  }
}, [rowData, column.formula]);
```

---

## Testing Formulas

### Unit Test Example

```typescript
import { FormulaEngine } from '@/lib/formulaEngine';

describe('Grade Calculation Formula', () => {
  test('calculates weighted average correctly', () => {
    const context = {
      A1: 80, // Homework (30%)
      B1: 90, // Midterm (30%)
      C1: 85, // Final (40%)
    };
    
    const result = FormulaEngine.evaluate(
      '=ROUND(A1*0.3 + B1*0.3 + C1*0.4, 2)',
      context
    );
    
    expect(result.error).toBeNull();
    expect(result.value).toBe(85.00);
  });
});
```

---

## Troubleshooting

### Debug Mode

```typescript
// Enable detailed logging
const result = FormulaEngine.evaluate(formula, context);

if (result.error) {
  console.group('Formula Debug');
  console.log('Formula:', formula);
  console.log('Context:', context);
  console.log('Error:', result.error);
  console.groupEnd();
}
```

### Validation

```typescript
// Validate before saving
const validation = FormulaEngine.validate('=SUM(A1:A10)');

if (!validation.valid) {
  alert('Invalid formula: ' + validation.error);
}
```

### Dependency Analysis

```typescript
// Find cell dependencies
const deps = FormulaEngine.getDependencies('=A1+B1*C1');
console.log(deps); // ['A1', 'B1', 'C1']

// Detect circular references
const formulas = {
  A1: '=B1',
  B1: '=C1',
  C1: '=A1', // Circular!
};

const dependencies = {
  A1: FormulaEngine.getDependencies(formulas.A1),
  B1: FormulaEngine.getDependencies(formulas.B1),
  C1: FormulaEngine.getDependencies(formulas.C1),
};

const cycles = FormulaEngine.detectCircular(dependencies);
console.log(cycles); // ['A1 → B1 → C1 → A1']
```

---

## Reference: Complete Function List

| Function | Category | Description |
|----------|----------|-------------|
| SUM | Math | Sum of values |
| AVERAGE | Math | Average of values |
| COUNT | Math | Count of numeric values |
| MIN | Math | Minimum value |
| MAX | Math | Maximum value |
| ROUND | Math | Round to decimal places |
| ABS | Math | Absolute value |
| POWER | Math | Exponentiation |
| SQRT | Math | Square root |
| MOD | Math | Remainder |
| IF | Logical | Conditional logic |
| AND | Logical | All conditions true |
| OR | Logical | Any condition true |
| NOT | Logical | Negation |
| TRUE | Logical | True value |
| FALSE | Logical | False value |
| IFERROR | Logical | Error handling |
| CONCAT | Text | Concatenate strings |
| CONCATENATE | Text | Concatenate strings |
| LEFT | Text | Left characters |
| RIGHT | Text | Right characters |
| MID | Text | Middle characters |
| LEN | Text | String length |
| UPPER | Text | Uppercase |
| LOWER | Text | Lowercase |
| TRIM | Text | Remove extra spaces |
| SUBSTITUTE | Text | Replace text |
| TODAY | Date | Current date |
| NOW | Date | Current datetime |
| YEAR | Date | Extract year |
| MONTH | Date | Extract month |
| DAY | Date | Extract day |
| DATEDIF | Date | Date difference |
