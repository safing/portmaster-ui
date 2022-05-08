import { Token, TokenType } from './token';
import { Lexer } from './lexer';
import { isValueToken, isWhitespace } from './helper';


interface ParseResult {
  conditions: {
    [key: string]: (any | { $ne: any })[];
  };
  textQuery: string;
}

export class Parser {
  private lexer: Lexer;
  private conditions: {
    [key: string]: any[];
  } = {};
  private remaining: string[] = [];

  constructor(input: string) {
    this.lexer = new Lexer(input);
  }

  static parse(input: string): ParseResult {
    return new Parser(input).process();
  }

  process(): ParseResult {
    let lastIdent: Token<TokenType.IDENT> | null = null;
    let hasColon = false;
    let not = false;

    while (true) {
      const tok = this.lexer.next()
      if (tok === null) {
        break;
      }

      console.log(tok)

      // Since we allow the user to enter values without quotes the
      // lexer might wrongly declare a "string value" as an IDENT.
      // If we have the pattern <IDENT><COLON><IDENT> we re-classify
      // the last IDENT as a VALUE
      if (!!lastIdent && hasColon && tok.type === TokenType.IDENT) {
        tok.type = TokenType.STRING;
      }

      if (tok.type === TokenType.IDENT) {
        // if we had an IDENT token before and got a new one now the
        // previous one is pushed to the remaining list
        if (!!lastIdent) {
          this.remaining.push(lastIdent.value)
        }
        lastIdent = tok;

        continue
      }

      // if we don't have an preceding IDENT token
      // this must be part of remaingin
      if (!lastIdent) {
        this.remaining.push(tok.literal);

        continue
      }

      // we would expect a colon now
      if (!hasColon) {
        if (tok.type !== TokenType.COLON) {
          // we expected a colon but got something else.
          // this means the last IDENT is part of remaining
          this.remaining.push(lastIdent.value);
          lastIdent = null;

          continue
        }

        // we have a colon now so proceed to the next token
        hasColon = true;
        not = false;

        continue
      }

      if (tok.type === TokenType.NOT && not === false) {
        not = true

        continue
      }

      if (isValueToken(tok)) {
        if (!this.conditions[lastIdent.value]) {
          this.conditions[lastIdent.value] = [];
        }

        if (!not) {
          this.conditions[lastIdent.value].push(tok.value)
        } else {
          this.conditions[lastIdent.value].push({ $ne: tok.value })
        }

        lastIdent = null
        hasColon = false
        not = false

        continue
      }

      this.remaining.push(lastIdent.value);
      lastIdent = null;
      hasColon = false;
      not = false;
    }

    if (!!lastIdent) {
      this.remaining.push(lastIdent.value);
    }

    return {
      conditions: this.conditions,
      textQuery: this.remaining.filter(tok => !isWhitespace(tok)).join(" "),
    }
  }
}
