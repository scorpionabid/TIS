/**
 * Formula Engine for Report Tables
 * Supports Excel-like formulas with cell references and functions
 */

export type CellValue = string | number | boolean | null | CellValue[];
export type CellContext = Record<string, CellValue>;

// ─── Token Types ─────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'CELL_REF'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'PAREN_OPEN'
  | 'PAREN_CLOSE'
  | 'COMMA'
  | 'COLON'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── AST Node Types ─────────────────────────────────────────────────────────

type ASTNode =
  | { type: 'literal'; value: CellValue }
  | { type: 'cell_ref'; ref: string }
  | { type: 'cell_range'; start: string; end: string }
  | { type: 'function_call'; name: string; args: ASTNode[] }
  | { type: 'binary_op'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary_op'; op: string; operand: ASTNode };

// ─── Tokenizer ───────────────────────────────────────────────────────────────

class Tokenizer {
  private input: string;
  private position = 0;

  constructor(input: string) {
    this.input = input.trim();
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.position < this.input.length) {
      const token = this.nextToken();
      if (token) tokens.push(token);
    }
    tokens.push({ type: 'EOF', value: '', position: this.position });
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();
    if (this.position >= this.input.length) return null;

    const char = this.input[this.position];
    const startPos = this.position;

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(this.peek(1)))) {
      let value = '';
      while (this.position < this.input.length && (/\d/.test(this.input[this.position]) || this.input[this.position] === '.')) {
        value += this.input[this.position++];
      }
      return { type: 'NUMBER', value, position: startPos };
    }

    // Strings (quoted)
    if (char === '"' || char === "'") {
      const quote = char;
      this.position++;
      let value = '';
      while (this.position < this.input.length && this.input[this.position] !== quote) {
        value += this.input[this.position++];
      }
      this.position++; // skip closing quote
      return { type: 'STRING', value, position: startPos };
    }

    // Cell references (A1, $A$1, A1:B10)
    if (/[A-Za-z]/.test(char)) {
      let value = '';
      while (this.position < this.input.length && /[A-Za-z\d$]/.test(this.input[this.position])) {
        value += this.input[this.position++];
      }
      
      // Check if it's a valid cell reference or function name
      if (/^\$?[A-Za-z]+\$?\d+$/.test(value)) {
        return { type: 'CELL_REF', value: value.toUpperCase(), position: startPos };
      } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        return { type: 'FUNCTION', value: value.toUpperCase(), position: startPos };
      }
    }

    // Operators
    if (/[\+\-\*\/=<>!&]/.test(char)) {
      let value = char;
      this.position++;
      // Check for two-character operators
      if (this.position < this.input.length) {
        const next = this.input[this.position];
        if ((char === '<' && (next === '=' || next === '>')) ||
            (char === '>' && next === '=') ||
            (char === '=' && next === '=') ||
            (char === '!' && next === '=') ||
            (char === '&' && next === '&') ||
            (char === '|' && next === '|')) {
          value += next;
          this.position++;
        }
      }
      return { type: 'OPERATOR', value, position: startPos };
    }

    // Parentheses
    if (char === '(') {
      this.position++;
      return { type: 'PAREN_OPEN', value: char, position: startPos };
    }
    if (char === ')') {
      this.position++;
      return { type: 'PAREN_CLOSE', value: char, position: startPos };
    }

    // Comma
    if (char === ',') {
      this.position++;
      return { type: 'COMMA', value: char, position: startPos };
    }

    // Colon (range operator)
    if (char === ':') {
      this.position++;
      return { type: 'COLON', value: char, position: startPos };
    }

    this.position++;
    return null;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  private peek(offset: number): string {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : '';
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    return this.parseExpression();
  }

  private current(): Token {
    return this.tokens[this.position] || { type: 'EOF', value: '', position: 0 };
  }

  private peek(offset = 1): Token {
    return this.tokens[this.position + offset] || { type: 'EOF', value: '', position: 0 };
  }

  private advance(): Token {
    return this.tokens[this.position++] || { type: 'EOF', value: '', position: 0 };
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type}`);
    }
    this.advance();
    return token;
  }

  // Expression parsing (lowest precedence)
  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    while (/^[<>=!]+/.test(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { type: 'binary_op', op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (/^[\+\-]/.test(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: 'binary_op', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (/^[\*\/]/.test(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'binary_op', op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.current().value === '-' || this.current().value === '+') {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { type: 'unary_op', op, operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    // Function call
    if (token.type === 'FUNCTION') {
      return this.parseFunctionCall();
    }

    // Cell reference or range
    if (token.type === 'CELL_REF') {
      const startRef = this.advance().value;
      if (this.current().type === 'COLON') {
        this.advance();
        const endRef = this.expect('CELL_REF').value;
        return { type: 'cell_range', start: startRef, end: endRef };
      }
      return { type: 'cell_ref', ref: startRef };
    }

    // Number literal
    if (token.type === 'NUMBER') {
      this.advance();
      return { type: 'literal', value: parseFloat(token.value) };
    }

    // String literal
    if (token.type === 'STRING') {
      this.advance();
      return { type: 'literal', value: token.value };
    }

    // Parenthesized expression
    if (token.type === 'PAREN_OPEN') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('PAREN_CLOSE');
      return expr;
    }

    throw new Error(`Unexpected token: ${token.type} (${token.value})`);
  }

  private parseFunctionCall(): ASTNode {
    const name = this.advance().value;
    this.expect('PAREN_OPEN');
    const args: ASTNode[] = [];

    if (this.current().type !== 'PAREN_CLOSE') {
      args.push(this.parseExpression());
      while (this.current().type === 'COMMA') {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    this.expect('PAREN_CLOSE');
    return { type: 'function_call', name, args };
  }
}

// ─── Built-in Functions ───────────────────────────────────────────────────────

const BUILTIN_FUNCTIONS: Record<string, (args: CellValue[]) => CellValue> = {
  // Math functions
  SUM: (args) => {
    const nums = args.flat().filter((v): v is number => typeof v === 'number');
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : 0;
  },
  AVERAGE: (args) => {
    const nums = args.flat().filter((v): v is number => typeof v === 'number');
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  },
  COUNT: (args) => {
    return args.flat().filter(v => v !== null && v !== '').length;
  },
  MIN: (args) => {
    const nums = args.flat().filter((v): v is number => typeof v === 'number');
    return nums.length > 0 ? Math.min(...nums) : null;
  },
  MAX: (args) => {
    const nums = args.flat().filter((v): v is number => typeof v === 'number');
    return nums.length > 0 ? Math.max(...nums) : null;
  },
  ROUND: (args) => {
    if (args.length < 1 || typeof args[0] !== 'number') return null;
    const num = args[0];
    const decimals = args.length > 1 && typeof args[1] === 'number' ? args[1] : 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
  ABS: (args) => {
    if (args.length < 1 || typeof args[0] !== 'number') return null;
    return Math.abs(args[0]);
  },
  POWER: (args) => {
    if (args.length < 2 || typeof args[0] !== 'number' || typeof args[1] !== 'number') return null;
    return Math.pow(args[0], args[1]);
  },
  SQRT: (args) => {
    if (args.length < 1 || typeof args[0] !== 'number') return null;
    return Math.sqrt(args[0]);
  },

  // Logic functions
  IF: (args) => {
    if (args.length < 2) return null;
    const condition = toBoolean(args[0]);
    return condition ? args[1] : (args[2] ?? null);
  },
  AND: (args) => {
    return args.every(v => toBoolean(v));
  },
  OR: (args) => {
    return args.some(v => toBoolean(v));
  },
  NOT: (args) => {
    return args.length > 0 ? !toBoolean(args[0]) : null;
  },
  TRUE: () => true,
  FALSE: () => false,

  // Date functions
  TODAY: () => {
    return new Date().toISOString().split('T')[0];
  },
  NOW: () => {
    return new Date().toISOString();
  },
  YEAR: (args) => {
    if (args.length < 1) return null;
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? null : d.getFullYear();
  },
  MONTH: (args) => {
    if (args.length < 1) return null;
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? null : d.getMonth() + 1;
  },
  DAY: (args) => {
    if (args.length < 1) return null;
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? null : d.getDate();
  },
  DATEDIF: (args) => {
    if (args.length < 3) return null;
    const start = new Date(String(args[0]));
    const end = new Date(String(args[1]));
    const unit = String(args[2]).toUpperCase();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffMs = end.getTime() - start.getTime();
    switch (unit) {
      case 'D': return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'M': return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      case 'Y': return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      default: return null;
    }
  },

  // Text functions
  CONCAT: (args) => args.map(String).join(''),
  CONCATENATE: (args) => args.map(String).join(''),
  LEFT: (args) => {
    if (args.length < 2 || typeof args[1] !== 'number') return String(args[0] ?? '').slice(0, 1);
    return String(args[0] ?? '').slice(0, args[1]);
  },
  RIGHT: (args) => {
    if (args.length < 2 || typeof args[1] !== 'number') {
      const s = String(args[0] ?? '');
      return s.slice(-1);
    }
    const s = String(args[0] ?? '');
    return s.slice(-args[1]);
  },
  MID: (args) => {
    if (args.length < 3 || typeof args[1] !== 'number' || typeof args[2] !== 'number') return null;
    return String(args[0] ?? '').substring(args[1] - 1, args[1] - 1 + args[2]);
  },
  LEN: (args) => String(args[0] ?? '').length,
  UPPER: (args) => String(args[0] ?? '').toUpperCase(),
  LOWER: (args) => String(args[0] ?? '').toLowerCase(),
  TRIM: (args) => String(args[0] ?? '').trim(),
  SUBSTITUTE: (args) => {
    if (args.length < 3) return String(args[0] ?? '');
    const text = String(args[0] ?? '');
    const oldText = String(args[1] ?? '');
    const newText = String(args[2] ?? '');
    return text.replace(new RegExp(oldText, 'g'), newText);
  },

  // Lookup functions
  VLOOKUP: (args) => {
    if (args.length < 3) return null;
    // Simplified implementation - in real use, would need table context
    return null;
  },
  IFERROR: (args) => {
    if (args.length < 2) return null;
    try {
      // First arg should be evaluated already
      return args[0] === null || args[0] === undefined || (typeof args[0] === 'number' && isNaN(args[0])) 
        ? args[1] 
        : args[0];
    } catch {
      return args[1];
    }
  },
};

function toBoolean(value: CellValue): boolean {
  if (value === null || value === '' || value === 0 || value === false) return false;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower !== 'false' && lower !== 'no' && lower !== '0' && lower !== 'xeyr';
  }
  return true;
}

// ─── Cell Reference Resolution ────────────────────────────────────────────────

function parseCellRef(ref: string): { col: number; row: number } {
  const match = ref.match(/^\$?([A-Z]+)\$?(\d+)$/);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  
  const colLetters = match[1];
  const row = parseInt(match[2], 10) - 1; // 0-indexed
  
  // Convert column letters to number (A=0, B=1, ...)
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 65);
  }
  
  return { col, row };
}

function getCellValue(ref: string, context: CellContext): CellValue {
  const normalizedRef = ref.replace(/\$/g, ''); // Remove $ signs
  return context[normalizedRef] ?? null;
}

function getCellRangeValues(start: string, end: string, context: CellContext): CellValue[] {
  const startPos = parseCellRef(start);
  const endPos = parseCellRef(end);
  
  const values: CellValue[] = [];
  for (let r = Math.min(startPos.row, endPos.row); r <= Math.max(startPos.row, endPos.row); r++) {
    for (let c = Math.min(startPos.col, endPos.col); c <= Math.max(startPos.col, endPos.col); c++) {
      const colLetters = String.fromCharCode(65 + c);
      const ref = `${colLetters}${r + 1}`;
      values.push(getCellValue(ref, context));
    }
  }
  return values;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

class Evaluator {
  constructor(private context: CellContext) {}

  evaluate(node: ASTNode): CellValue {
    switch (node.type) {
      case 'literal':
        return node.value;
      case 'cell_ref':
        return getCellValue(node.ref, this.context);
      case 'cell_range':
        return getCellRangeValues(node.start, node.end, this.context);
      case 'function_call':
        return this.evaluateFunction(node.name, node.args);
      case 'binary_op':
        return this.evaluateBinaryOp(node.op, node.left, node.right);
      case 'unary_op':
        return this.evaluateUnaryOp(node.op, node.operand);
      default:
        return null;
    }
  }

  private evaluateFunction(name: string, args: ASTNode[]): CellValue {
    const fn = BUILTIN_FUNCTIONS[name];
    if (!fn) throw new Error(`Unknown function: ${name}`);
    
    const evaluatedArgs = args.map(arg => this.evaluate(arg));
    return fn(evaluatedArgs);
  }

  private evaluateBinaryOp(op: string, left: ASTNode, right: ASTNode): CellValue {
    const l = this.evaluate(left);
    const r = this.evaluate(right);
    
    // Handle nulls
    if (l === null || r === null) {
      if (op === '=') return l === r;
      if (op === '<>') return l !== r;
      return null;
    }
    
    // Numeric operations
    if (typeof l === 'number' && typeof r === 'number') {
      switch (op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r !== 0 ? l / r : null;
        case '^': return Math.pow(l, r);
        case '=': return l === r;
        case '<>': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
      }
    }
    
    // String comparison
    if (typeof l === 'string' && typeof r === 'string') {
      switch (op) {
        case '=': return l === r;
        case '<>': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        case '&': return l + r;
      }
    }
    
    // Mixed string + number (concatenation)
    if (op === '&') return String(l) + String(r);
    
    // Boolean operations
    if (typeof l === 'boolean' && typeof r === 'boolean') {
      switch (op) {
        case '=': return l === r;
        case '<>': return l !== r;
        case '&&': return l && r;
        case '||': return l || r;
      }
    }
    
    return null;
  }

  private evaluateUnaryOp(op: string, operand: ASTNode): CellValue {
    const val = this.evaluate(operand);
    
    if (op === '-') {
      if (typeof val === 'number') return -val;
      return null;
    }
    
    if (op === '+') {
      if (typeof val === 'number') return +val;
      return null;
    }
    
    return null;
  }
}

// ─── Formula Engine Public API ───────────────────────────────────────────────

export interface FormulaResult {
  value: CellValue;
  error: string | null;
}

export class FormulaEngine {
  /**
   * Evaluate a formula string
   */
  static evaluate(formula: string, context: CellContext): FormulaResult {
    try {
      // Handle formula prefix
      if (formula.startsWith('=')) {
        formula = formula.slice(1);
      }
      
      const tokenizer = new Tokenizer(formula);
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator(context);
      const value = evaluator.evaluate(ast);
      
      return { value, error: null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  /**
   * Validate a formula without evaluating
   */
  static validate(formula: string): { valid: boolean; error: string | null } {
    try {
      if (formula.startsWith('=')) {
        formula = formula.slice(1);
      }
      
      const tokenizer = new Tokenizer(formula);
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Invalid formula' };
    }
  }
  
  /**
   * Get cell dependencies from a formula
   */
  static getDependencies(formula: string): string[] {
    try {
      if (formula.startsWith('=')) {
        formula = formula.slice(1);
      }
      
      const tokenizer = new Tokenizer(formula);
      const tokens = tokenizer.tokenize();
      const deps: string[] = [];
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'CELL_REF') {
          const normalized = token.value.replace(/\$/g, '');
          if (!deps.includes(normalized)) {
            deps.push(normalized);
          }
        }
        // Handle ranges
        if (token.type === 'COLON' && i > 0 && i < tokens.length - 1) {
          const prev = tokens[i - 1];
          const next = tokens[i + 1];
          if (prev.type === 'CELL_REF' && next.type === 'CELL_REF') {
            const start = parseCellRef(prev.value);
            const end = parseCellRef(next.value);
            for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
              for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
                const colLetters = String.fromCharCode(65 + c);
                const ref = `${colLetters}${r + 1}`;
                if (!deps.includes(ref)) deps.push(ref);
              }
            }
          }
        }
      }
      
      return deps;
    } catch {
      return [];
    }
  }
  
  /**
   * Detect circular references in a set of formulas
   */
  static detectCircular(dependencies: Record<string, string[]>): string[] {
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function dfs(node: string, path: string[]): void {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).concat(node);
          cycles.push(cycle.join(' → '));
        }
        return;
      }
      
      if (visited.has(node)) return;
      
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      
      const deps = dependencies[node] || [];
      for (const dep of deps) {
        dfs(dep, [...path]);
      }
      
      recursionStack.delete(node);
    }
    
    for (const node of Object.keys(dependencies)) {
      dfs(node, []);
    }
    
    return cycles;
  }
  
  /**
   * Get list of available functions with descriptions
   */
  static getFunctionList(): { name: string; description: string; example: string }[] {
    return [
      { name: 'SUM', description: 'Rəqəmləri cəmləyir', example: 'SUM(A1:A10)' },
      { name: 'AVERAGE', description: 'Ortalama hesablayır', example: 'AVERAGE(B1:B5)' },
      { name: 'COUNT', description: 'Dolu xanaları sayır', example: 'COUNT(A1:A10)' },
      { name: 'MIN', description: 'Minimum dəyəri tapır', example: 'MIN(C1:C10)' },
      { name: 'MAX', description: 'Maksimum dəyəri tapır', example: 'MAX(C1:C10)' },
      { name: 'ROUND', description: 'Yuvarlaqlaşdırır', example: 'ROUND(A1, 2)' },
      { name: 'ABS', description: 'Mütləq dəyər', example: 'ABS(A1)' },
      { name: 'IF', description: 'Şərti yoxlama', example: 'IF(A1>100, "Yüksək", "Aşağı")' },
      { name: 'AND', description: 'Və məntiqi', example: 'AND(A1>0, B1>0)' },
      { name: 'OR', description: 'Və ya məntiqi', example: 'OR(A1=0, B1=0)' },
      { name: 'NOT', description: 'Tərs məntiqi', example: 'NOT(A1)' },
      { name: 'TRUE', description: 'Doğru dəyər', example: 'TRUE()' },
      { name: 'FALSE', description: 'Yalan dəyər', example: 'FALSE()' },
      { name: 'TODAY', description: 'Bugünün tarixi', example: 'TODAY()' },
      { name: 'NOW', description: 'Cari tarix və vaxt', example: 'NOW()' },
      { name: 'YEAR', description: 'İli çıxarır', example: 'YEAR(A1)' },
      { name: 'MONTH', description: 'Ayı çıxarır', example: 'MONTH(A1)' },
      { name: 'DAY', description: 'Günü çıxarır', example: 'DAY(A1)' },
      { name: 'DATEDIF', description: 'Tarix fərqi', example: 'DATEDIF(A1, B1, "D")' },
      { name: 'CONCAT', description: 'Mətn birləşdirir', example: 'CONCAT(A1, " ", B1)' },
      { name: 'LEFT', description: 'Soldan simvollar', example: 'LEFT(A1, 3)' },
      { name: 'RIGHT', description: 'Sağdan simvollar', example: 'RIGHT(A1, 3)' },
      { name: 'MID', description: 'Orta simvollar', example: 'MID(A1, 2, 3)' },
      { name: 'LEN', description: 'Uzunluq', example: 'LEN(A1)' },
      { name: 'UPPER', description: 'Böyük hərf', example: 'UPPER(A1)' },
      { name: 'LOWER', description: 'Kiçik hərf', example: 'LOWER(A1)' },
      { name: 'TRIM', description: 'Boşluqları təmizləyir', example: 'TRIM(A1)' },
      { name: 'IFERROR', description: 'Xəta idarəetməsi', example: 'IFERROR(A1/B1, 0)' },
    ];
  }
}

export default FormulaEngine;
