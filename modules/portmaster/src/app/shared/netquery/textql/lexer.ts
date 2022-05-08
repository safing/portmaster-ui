import { isDigit, isIdentChar, isWhitespace, isLetter } from "./helper";
import { InputStream } from "./input";
import { Token, TokenType } from "./token";

export class Lexer {
  private _current: Token<any> | null = null;
  private _input: InputStream;

  constructor(input: string) {
    this._input = new InputStream(input);
  }

  /** peek returns the token at the current position in input. */
  public peek(): Token<any> | null {
    return this._current || (this._current = this.readNextToken());
  }

  /** next returns either the current token in input or reads the next one */
  public next(): Token<any> | null {
    let tok = this._current;
    this._current = null;
    return tok || this.readNextToken();
  }

  /** eof returns true if the lexer reached the end of the input stream */
  public eof(): boolean {
    return this.peek() === null;
  }

  /** croak throws and error message at the current position in the input stream */
  public croak(msg: string): never {
    return this._input.croak(`${msg}. Current token is "${!!this.peek() ? this.peek()!.literal : null}"`);
  }

  /** consumes the input stream as long as predicate returns true */
  private readWhile(predicate: (ch: string) => boolean): string {
    let str = '';
    while (!this._input.eof() && predicate(this._input.peek())) {
      str += this._input.next();
    }

    return str;
  }

  /** reads a number token */
  private readNumber(): Token<TokenType.NUMBER> {
    let has_dot = false;
    let number = this.readWhile((ch: string) => {
      if (ch === '.') {
        if (has_dot) {
          return false;
        }

        has_dot = true;
        return true;
      }
      return isDigit(ch);
    });

    if (!this._input.eof() && isIdentChar(this._input.peek())) {
      this._input.revert(number.length + 1);
      this._input.croak("invalid number character")
    }

    return {
      type: TokenType.NUMBER,
      literal: number,
      value: has_dot ? parseFloat(number) : parseInt(number)
    }
  }

  private readIdent(): Token<TokenType.IDENT | TokenType.BOOL> {
    const id = this.readWhile(ch => isIdentChar(ch));
    if (id === 'true') {
      return {
        type: TokenType.BOOL,
        literal: id,
        value: true
      }
    }
    if (id === 'false') {
      return {
        type: TokenType.BOOL,
        literal: id,
        value: false
      }
    }

    return {
      type: TokenType.IDENT,
      literal: id,
      value: id,
    };
  }

  private readEscaped(end: string | RegExp): string {
    let escaped = false;
    let str = '';

    // Skip the start character
    this._input.next();

    while (!this._input.eof()) {
      let ch = this._input.next()!;
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if ((typeof end === 'string' && ch === end) || (end instanceof RegExp && end.test(ch))) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  }

  private readString(quote: string | RegExp): Token<TokenType.STRING> {
    const value = this.readEscaped(quote)
    return {
      type: TokenType.STRING,
      literal: value,
      value: value,
    }
  }

  private readWhitespace(): Token<TokenType.WHITESPACE> {
    const value = this.readWhile(ch => isWhitespace(ch));
    return {
      type: TokenType.WHITESPACE,
      literal: value,
      value: value
    }
  }

  private readNextToken(): Token<any> | null {
    const ch = this._input.peek();
    if (ch === '') {
      return null;
    }

    if (isWhitespace(ch)) {
      return this.readWhitespace()
    }

    if (ch === '"') {
      return this.readString('"');
    }

    if (ch === '\'') {
      return this.readString('\'');
    }

    try {
      if (isDigit(ch)) {
        return this.readNumber();
      }
    } catch (err) {
      // we ignore that error here as it may only happen for unqoted strings
      // that start with a number.
    }

    if (ch === ':') {
      this._input.next();
      return {
        type: TokenType.COLON,
        value: ':',
        literal: ':'
      }
    }

    if (ch === '!') {
      this._input.next();
      return {
        type: TokenType.NOT,
        value: '!',
        literal: '!'
      }
    }

    if (isIdentChar(ch)) {
      const ident = this.readIdent();

      const next = this._input.peek();
      if (!this._input.eof() && (!isWhitespace(next) && next !== ':')) {
        // identifiers should always end in a colon or with a whitespace.
        // if neither is the case we are in the middle of a token and are
        // likely parsing a string without quotes.
        this._input.revert(ident.literal.length + 1);

        // read the string and revert by one as we terminate the string
        // at the next WHITESPACE token
        const tok = this.readString(new RegExp('\\s'))
        if (!this._input.eof()) {
          this._input.revert(1)
        }
        return tok;
      }

      return ident;
    }

    if (isLetter(ch)) {
      const tok = this.readString(new RegExp('\\s'))

      // read the string and revert by one as we terminate the string
      // at the next WHITESPACE token
      if (!this._input.eof()) {
        this._input.revert(1)
      }
      return tok
    }

    // Failed to handle the input character
    return this._input.croak(`Can't handle character: ${ch}`);
  }
}


