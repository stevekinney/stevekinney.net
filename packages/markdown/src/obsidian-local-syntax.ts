import type { Plugin } from 'unified';
import type { Literal } from 'mdast';
import type { Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { Construct, Extension as MicromarkExtension, State } from 'micromark-util-types';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';

interface Comment extends Literal {
  type: 'comment';
}
interface BlockDefinition extends Literal {
  type: 'blockDefinition';
}
declare module 'micromark-util-types' {
  interface TokenTypeMap {
    obsidianComment: 'obsidianComment';
    obsidianCommentData: 'obsidianCommentData';
    obsidianBlockDefinition: 'obsidianBlockDefinition';
  }
}
declare module 'mdast' {
  interface RootContentMap {
    comment: Comment;
    blockDefinition: BlockDefinition;
  }
  interface PhrasingContentMap {
    comment: Comment;
    blockDefinition: BlockDefinition;
  }
}

const comment: Construct = {
  name: 'obsidianComment',
  previous: (code) => code !== 92,
  tokenize: (effects, ok, nok) => {
    return start;

    function start(code: number | null): State | undefined {
      if (code !== 37) return nok(code);
      effects.enter('obsidianComment');
      effects.enter('obsidianCommentData');
      effects.consume(code);
      return second;
    }

    function second(code: number | null): State | undefined {
      if (code !== 37) return nok(code);
      effects.consume(code);
      return body;
    }

    function body(code: number | null): State | undefined {
      if (code === null) {
        effects.exit('obsidianCommentData');
        effects.exit('obsidianComment');
        return ok(code);
      }
      if (markdownLineEnding(code)) {
        effects.exit('obsidianCommentData');
        effects.enter('lineEnding');
        effects.consume(code);
        effects.exit('lineEnding');
        return continuation;
      }
      if (code === 37) {
        effects.consume(code);
        return close;
      }
      effects.consume(code);
      return body;
    }

    function continuation(code: number | null): State | undefined {
      if (code === null) {
        effects.exit('obsidianComment');
        return ok(code);
      }
      if (markdownLineEnding(code)) {
        effects.enter('lineEnding');
        effects.consume(code);
        effects.exit('lineEnding');
        return continuation;
      }
      effects.enter('obsidianCommentData');
      return body(code);
    }

    function close(code: number | null): State | undefined {
      if (code === 37) {
        effects.consume(code);
        effects.exit('obsidianCommentData');
        effects.exit('obsidianComment');
        return ok;
      }
      if (code === null) {
        effects.exit('obsidianCommentData');
        effects.exit('obsidianComment');
        return ok(code);
      }
      return body(code);
    }
  },
};

const trailingWhitespace: Construct = {
  partial: true,
  tokenize: (effects, ok, nok) => {
    const check: State = (code) => {
      if (code === null || markdownLineEnding(code)) return ok(code);
      if (!markdownSpace(code)) return nok(code);
      effects.consume(code);
      return check;
    };
    return check;
  },
};

const blockDefinition: Construct = {
  name: 'obsidianBlockDefinition',
  previous: (code) => code === null || markdownSpace(code) || markdownLineEnding(code),
  tokenize: (effects, ok, nok) => {
    let value = '';
    return start;

    function start(code: number | null): State | undefined {
      if (code !== 94) return nok(code);
      effects.enter('obsidianBlockDefinition');
      effects.consume(code);
      return identifier;
    }

    function identifier(code: number | null): State | undefined {
      if (code !== null && /[A-Za-z0-9-]/u.test(String.fromCharCode(code))) {
        value += String.fromCharCode(code);
        effects.consume(code);
        return identifier;
      }
      if (!value.length) return nok(code);
      return effects.check(trailingWhitespace, finish, nok)(code);
    }
    function finish(code: number | null): State | undefined {
      effects.exit('obsidianBlockDefinition');
      return ok(code);
    }
  },
};

/** Micromark syntax extension for comments and block definitions. */
export const obsidianLocalSyntax = (): MicromarkExtension => ({
  text: { 37: comment, 94: blockDefinition },
});

const enterNode: Handle = function (token) {
  this.enter(
    { type: token.type === 'obsidianComment' ? 'comment' : 'blockDefinition', value: '' },
    token,
  );
};

const exitNode: Handle = function (token) {
  const node = this.stack[this.stack.length - 1];
  if (node.type !== 'comment' && node.type !== 'blockDefinition')
    throw new Error('Unexpected Obsidian mdast stack.');
  node.value = this.sliceSerialize(token).replace(/^\^/u, '');
  this.exit(token);
};

/** mdast handlers for the local Obsidian syntax tokens. */
export const obsidianLocalFromMarkdown = (): FromMarkdownExtension => ({
  enter: { obsidianComment: enterNode, obsidianBlockDefinition: enterNode },
  exit: { obsidianComment: exitNode, obsidianBlockDefinition: exitNode },
});

/** Register the local micromark and mdast extensions with a unified processor. */
export const remarkObsidianLocal: Plugin = function (): void {
  const data = this.data();
  const micromarkExtensions = (data.micromarkExtensions ??= []) as MicromarkExtension[];
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as FromMarkdownExtension[];
  micromarkExtensions.push(obsidianLocalSyntax());
  fromMarkdownExtensions.push(obsidianLocalFromMarkdown());
};
