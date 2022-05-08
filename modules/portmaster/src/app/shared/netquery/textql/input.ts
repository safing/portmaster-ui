/** Input stream returns one character at a time */
export class InputStream {
  private _pos: number = 0;
  private _col: number = 0;
  private _line: number = 0;

  constructor(private _input: string) { }

  /** Returns the next character and removes it from the stream */
  next(): string | null {
    const ch = this._input.charAt(this._pos++);
    if (ch === '\n') {
      this._line++;
      this._col = 0;
    } else {
      this._col++;
    }

    return ch;
  }

  get pos() {
    return this._pos;
  }

  get line() {
    return this._line;
  }

  get col() {
    return this._col;
  }

  /** Revert moves the current stream position back by `num` characters */
  revert(num: number) {
    for (let i = num; i > 0; i--) {
      this._pos--;
      this._col--;
      if (this._col < 0) {
        this._line--;
        let p = 0;
        // TODO(ppacher): the column is now incorrect! fix it
        console.log(`Line and columns are now incorrect`);
      }
    }
  }

  /** Returns the next character in the stream but does not remove it */
  peek(): string {
    return this._input.charAt(this._pos);
  }

  /** Returns true if we reached the end of the stream */
  eof(): boolean {
    return this.peek() == '';
  }

  /** Throws an error with the current line and column */
  croak(msg: string): never {
    throw new Error(`${msg} at ${this._line}:${this._col}`);
  }
}
