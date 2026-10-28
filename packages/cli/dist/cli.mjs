#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/token.js
var require_token = __commonJS({
  "../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/token.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Token = exports.EOF = exports.IDENT = exports.DIGIT = exports.CLAWLDELAY = exports.SITEMAP = exports.DISALLOW = exports.ALLOW = exports.SEPARATOR = exports.COMMENT = exports.USERAGENT = void 0;
    exports.USERAGENT = "USERAGENT";
    exports.COMMENT = "COMMENT";
    exports.SEPARATOR = "SEPARATOR";
    exports.ALLOW = "ALLOW";
    exports.DISALLOW = "DISALLOW";
    exports.SITEMAP = "SITEMAP";
    exports.CLAWLDELAY = "CLAWLDELAY";
    exports.DIGIT = "DIGIT";
    exports.IDENT = "IDENT";
    exports.EOF = "EOF";
    var Token = class {
      constructor(t, literal, line, index) {
        this.tokenType = t;
        this.literal = literal;
        this.line = line;
        this.index = index;
      }
    };
    exports.Token = Token;
  }
});

// ../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/exceptions.js
var require_exceptions = __commonJS({
  "../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/exceptions.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidProductToken = exports.UnexpectedToken = exports.UnexpectedCharacter = void 0;
    var UnexpectedCharacter = class extends Error {
      constructor(c, line, index) {
        super(`Unexpected Character "${c}" found at line ${line}, position ${index}`);
      }
    };
    exports.UnexpectedCharacter = UnexpectedCharacter;
    var UnexpectedToken = class extends Error {
      constructor(t, expects) {
        super([
          `Unexpected Token "${t.literal}" found`,
          expects ? ` Expects ${expects}` : "",
          ` at line ${t.line}, position ${t.index}`
        ].join(""));
      }
    };
    exports.UnexpectedToken = UnexpectedToken;
    var InvalidProductToken = class extends Error {
      constructor(t) {
        super([
          "Product token MUST only contains a-zA-Z_- characters",
          ` at line ${t.line}, position ${t.index}`
        ].join(""));
      }
    };
    exports.InvalidProductToken = InvalidProductToken;
  }
});

// ../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/lexer.js
var require_lexer = __commonJS({
  "../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/lexer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Lexer = void 0;
    exports.lexer = lexer;
    var token_1 = require_token();
    var exceptions_1 = require_exceptions();
    function lexer(input) {
      return new Lexer(typeof input === "string" ? new TextEncoder().encode(input) : input);
    }
    var Lexer = class {
      // Constructor: initialize states
      constructor(input) {
        this.stack = [];
        this.peeks = [];
        this.isEOF = false;
        this.current = 0;
        this.pointer = -1;
        this.line = 1;
        this.index = 0;
        this.input = input;
        this.buffer = [];
        this.read();
      }
      // read() reads next character
      read() {
        const c = this.input[++this.pointer];
        if (c === void 0) {
          this.current = 0;
          this.index++;
          return;
        }
        if (this.current === 10) {
          this.newLine();
        }
        this.index++;
        this.current = c;
        this.buffer.push(c);
      }
      // read more next character
      peek() {
        if (this.pointer >= this.input.byteLength - 1) {
          return 0;
        }
        return this.input[this.pointer + 1];
      }
      // reset line and index status
      newLine() {
        this.stack.push(String.fromCodePoint(...this.buffer));
        this.buffer = [];
        this.index = 0;
        this.line++;
      }
      // read peek token
      peekToken() {
        const tok = this.nextToken();
        this.peeks.push(tok);
        return tok;
      }
      // read next token
      nextToken() {
        if (this.isEOF) {
          return new token_1.Token(token_1.EOF, "", this.line, this.index);
        }
        if (this.peeks.length > 0) {
          const peek = this.peeks.shift();
          if (!peek) {
            throw new Error("Undefined peek");
          }
          return peek;
        }
        this.skipWhitespace();
        if (this.pointer > this.input.byteLength - 1) {
          this.isEOF = true;
          return new token_1.Token(token_1.EOF, "", this.line, this.index);
        }
        let t;
        const line = this.line;
        const index = this.index;
        switch (this.current) {
          case 58:
            t = new token_1.Token(token_1.SEPARATOR, ":", line, index);
            break;
          case 35:
            t = new token_1.Token(token_1.COMMENT, String.fromCodePoint(...this.readEOL()), line, index);
            break;
          default:
            if (this.isDigit(this.current)) {
              t = new token_1.Token(token_1.DIGIT, String.fromCodePoint(...this.readDigit()), line, index);
            } else if (this.isCharacter(this.current)) {
              const literal = this.readIdentifier();
              const ident = String.fromCodePoint(...literal);
              switch (ident.toLowerCase()) {
                case "user-agent":
                  t = new token_1.Token(token_1.USERAGENT, ident, line, index);
                  break;
                case "allow":
                  t = new token_1.Token(token_1.ALLOW, ident, line, index);
                  break;
                case "disallow":
                  t = new token_1.Token(token_1.DISALLOW, ident, line, index);
                  break;
                case "clawl-delay":
                  t = new token_1.Token(token_1.CLAWLDELAY, ident, line, index);
                  break;
                case "sitemap":
                  t = new token_1.Token(token_1.SITEMAP, ident, line, index);
                  break;
                default:
                  t = new token_1.Token(token_1.IDENT, ident, line, index);
                  break;
              }
            } else {
              throw new exceptions_1.UnexpectedCharacter(String.fromCharCode(this.current), line, index);
            }
        }
        this.read();
        return t;
      }
      // Skip whitespace-related characters.
      // Lexer skips WHITESPACE(0x20), HORIZONTAL_TAB(0x09), CARRIGE_RETURN(0x0d) and LINE_FEED(0x0a)
      skipWhitespace() {
        while (true) {
          if (this.current === 32 || // WHITESPACE
          this.current === 9 || // HORIZONTAL_TAB
          this.current === 13 || // CARRIGE_RETURN
          this.current === 10) {
            this.read();
            continue;
          }
          break;
        }
      }
      // Check curent code point indicates character code.
      // Lexer treats character as:
      // 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"$%'()*+,-./:;<=>?@[\]^_`{|}~
      isCharacter(code) {
        return code >= 33 && code <= 126 && code !== 58 && code !== 35;
      }
      // Check current code point incicated digit code.
      isDigit(code) {
        return code >= 48 && code <= 57;
      }
      // Read identifiler characters
      readIdentifier() {
        const codes = [this.current];
        while (true) {
          if (!this.isCharacter(this.peek())) {
            return codes;
          }
          this.read();
          codes.push(this.current);
        }
      }
      // Read decimal characters
      readDigit() {
        const codes = [this.current];
        while (true) {
          if (!this.isDigit(this.peek())) {
            return codes;
          }
          this.read();
          codes.push(this.current);
        }
      }
      // Read characters until LF is found
      readEOL() {
        const codes = [];
        if (this.current === 0 || this.current === 10) {
          return codes;
        }
        codes.push(this.current);
        while (true) {
          const peek = this.peek();
          if (peek === 0 || peek === 10) {
            return codes;
          }
          this.read();
          codes.push(this.current);
        }
      }
    };
    exports.Lexer = Lexer;
  }
});

// ../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/parser.js
var require_parser = __commonJS({
  "../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse;
    exports.decodePath = decodePath2;
    var lexer_1 = require_lexer();
    var token_1 = require_token();
    var exceptions_1 = require_exceptions();
    function parse(robots) {
      const l = (0, lexer_1.lexer)(robots);
      const result = [];
      let token;
      while (true) {
        token = l.nextToken();
        switch (token.tokenType) {
          case token_1.USERAGENT:
            result.push(parseGroup(l));
            break;
          case token_1.SITEMAP:
            skipLine(l);
            break;
          case token_1.COMMENT:
            break;
          case token_1.EOF:
            return result;
          default:
            throw new exceptions_1.UnexpectedToken(token);
        }
      }
    }
    function skipLine(l) {
      let token = nextTokenIs(l, token_1.SEPARATOR);
      while (true) {
        token = l.peekToken();
        if (token.tokenType === token_1.EOF) {
          return;
        }
        if (token.tokenType !== token_1.IDENT && token.tokenType !== token_1.SEPARATOR && token.tokenType !== token_1.COMMENT && token.tokenType !== token_1.DIGIT) {
          return;
        }
        l.nextToken();
      }
    }
    function parseGroup(l) {
      const rule = {
        userAgent: "",
        rules: []
      };
      let token = nextTokenIs(l, token_1.SEPARATOR);
      token = nextTokenIs(l, token_1.IDENT);
      if (token.literal !== "*" && !/^[0-9a-zA-Z_-]+$/.test(token.literal)) {
        throw new exceptions_1.InvalidProductToken(token);
      }
      rule.userAgent = token.literal;
      while (true) {
        token = l.peekToken();
        if (token.tokenType === token_1.EOF || token.tokenType === token_1.USERAGENT || token.tokenType === token_1.SITEMAP) {
          break;
        }
        token = l.nextToken();
        switch (token.tokenType) {
          case token_1.COMMENT:
            break;
          case token_1.CLAWLDELAY:
            nextTokenIs(l, token_1.SEPARATOR);
            nextTokenIs(l, token_1.DIGIT);
            break;
          case token_1.ALLOW:
            rule.rules.push({ type: "ALLOW", path: parseRule(l) });
            break;
          case token_1.DISALLOW:
            rule.rules.push({ type: "DISALLOW", path: parseRule(l) });
            break;
          default:
            throw new exceptions_1.UnexpectedToken(token);
        }
      }
      return rule;
    }
    function parseRule(l) {
      let token = nextTokenIs(l, token_1.SEPARATOR);
      const patterns = [];
      while (true) {
        token = l.peekToken();
        if (token.tokenType !== token_1.IDENT && token.tokenType !== token_1.SEPARATOR && token.tokenType !== token_1.COMMENT) {
          break;
        }
        token = l.nextToken();
        if (token.tokenType !== token_1.COMMENT) {
          patterns.push(decodePath2(token.literal));
        }
      }
      return patterns.join("");
    }
    function nextTokenIs(l, expect) {
      const token = l.nextToken();
      if (token.tokenType !== expect) {
        throw new exceptions_1.UnexpectedToken(token, expect);
      }
      return token;
    }
    function decodePath2(literal) {
      return decodeURIComponent(literal.replace(/[uU]\+([a-zA-Z0-9]{6})/g, (_, m) => {
        return [
          `%${m.slice(0, 2)}`,
          `%${m.slice(2, 4)}`,
          `%${m.slice(4, 6)}`
        ].join("");
      }));
    }
  }
});

// ../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/robots-linter@0.7.0/node_modules/robots-linter/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_parser(), exports);
  }
});

// src/run.ts
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

// ../core/src/parse.ts
var DIRECTIVE_MAP = {
  "allow": "allow",
  "disallow": "disallow",
  "crawl-delay": "crawl-delay",
  "host": "host"
};
function parseDirectiveName(line) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }
  const name = line.slice(0, colonIndex).trim();
  const value = line.slice(colonIndex + 1).trim();
  return { name, value };
}
function stripComment(line) {
  const hashIndex = line.indexOf("#");
  if (hashIndex === -1) {
    return line.trim();
  }
  return line.slice(0, hashIndex).trim();
}
function isUserAgentLineContent(line) {
  const content = stripComment(line);
  if (!content) {
    return false;
  }
  const parsed = parseDirectiveName(content);
  return parsed !== null && normalizeDirectiveName(parsed.name) === "useragent";
}
function normalizeDirectiveName(name) {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}
function resolveDirectiveType(name) {
  const normalized = normalizeDirectiveName(name);
  if (normalized === "useragent") {
    return "unknown";
  }
  if (normalized === "sitemap") {
    return "unknown";
  }
  const mapped = DIRECTIVE_MAP[normalized];
  if (mapped) {
    return mapped;
  }
  if (normalized === "disalow" || normalized === "dissallow") {
    return "disallow";
  }
  if (normalized === "crawldelay") {
    return "crawl-delay";
  }
  return "unknown";
}
function isUserAgentLine(name) {
  return normalizeDirectiveName(name) === "useragent";
}
function isSitemapLine(name) {
  return normalizeDirectiveName(name) === "sitemap";
}
function parseRobotsTxt(text) {
  const lines = text.split(/\r?\n/);
  const groups = [];
  const sitemaps = [];
  let currentGroup = null;
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const content = stripComment(raw);
    if (!content) {
      continue;
    }
    const parsed = parseDirectiveName(content);
    if (!parsed) {
      continue;
    }
    const { name, value } = parsed;
    if (isUserAgentLine(name)) {
      if (!currentGroup || currentGroup.directives.length > 0) {
        currentGroup = {
          userAgents: [],
          directives: [],
          startLine: lineNum
        };
        groups.push(currentGroup);
      }
      currentGroup.userAgents.push(value);
      continue;
    }
    if (isSitemapLine(name)) {
      currentGroup = null;
      sitemaps.push({ url: value, line: lineNum });
      continue;
    }
    const directive = {
      type: resolveDirectiveType(name),
      name,
      value,
      line: lineNum,
      raw
    };
    if (!currentGroup) {
      currentGroup = {
        userAgents: [],
        directives: [],
        startLine: lineNum
      };
      groups.push(currentGroup);
    }
    currentGroup.directives.push(directive);
  }
  return {
    groups,
    sitemaps,
    raw: text,
    lines
  };
}

// ../core/src/validate.ts
var import_robots_linter2 = __toESM(require_dist(), 1);

// ../core/src/robots-text.ts
var USER_AGENT_SEPARATOR_PATTERN = /[\s\u00a0\u2011\u2010\u2012\u2013\u2014-]+/g;
function normalizeDirectiveName2(name) {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}
function normalizeUserAgentForLinter(value) {
  const trimmed = value.trim();
  if (trimmed === "*") {
    return "*";
  }
  const rewritten = trimmed.replace(USER_AGENT_SEPARATOR_PATTERN, "_").replace(/[^0-9a-zA-Z_]/g, "");
  return rewritten || "agent";
}
function normalizeUserAgentForMatch(value) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "*") {
    return "*";
  }
  return trimmed.replace(USER_AGENT_SEPARATOR_PATTERN, "_").replace(/[^0-9a-z0-9_]/g, "");
}
function rewriteUserAgentLine(line) {
  const commentIndex = line.indexOf("#");
  const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
  const withoutComment = commentIndex === -1 ? line : line.slice(0, commentIndex);
  const content = withoutComment.trim();
  const colonIndex = content.indexOf(":");
  if (colonIndex === -1) {
    return line;
  }
  const name = content.slice(0, colonIndex).trim();
  const value = content.slice(colonIndex + 1).trim();
  const leading = withoutComment.slice(0, withoutComment.indexOf(content));
  const rewritten = normalizeUserAgentForLinter(value);
  if (!comment) {
    return `${leading}${name}: ${rewritten}`;
  }
  return `${leading}${name}: ${rewritten}  ${comment.trim()}`;
}
function textForLint(doc) {
  const lintableDirectives = /* @__PURE__ */ new Set(["useragent", "allow", "disallow", "sitemap"]);
  return doc.lines.map((line) => {
    const content = stripComment(line);
    if (!content) {
      return line;
    }
    const colonIndex = content.indexOf(":");
    if (colonIndex === -1) {
      return line;
    }
    const normalized = normalizeDirectiveName2(content.slice(0, colonIndex).trim());
    if (normalized === "useragent") {
      return rewriteUserAgentLine(line);
    }
    if (lintableDirectives.has(normalized)) {
      return line;
    }
    return `# ${line}`;
  }).join("\n");
}
function userAgentMatches(ruleAgent, requestAgent) {
  const rule = normalizeUserAgentForMatch(ruleAgent);
  const request = normalizeUserAgentForMatch(requestAgent);
  if (rule === "*") {
    return request === "*";
  }
  return request.includes(rule);
}

// ../core/src/match.ts
var import_robots_linter = __toESM(require_dist(), 1);
var DEFAULT_MATCH = {
  allowed: true,
  matchedPattern: "(default allow)",
  matchedRuleType: "none",
  matchingLine: 0
};
function toRegExpPath(path) {
  if (!path) {
    return /(?!)/;
  }
  const anchored = path.endsWith("$");
  const body = anchored ? path.slice(0, -1) : path;
  const source = body.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`);
}
function isStarUserAgent(agent) {
  return normalizeUserAgentForMatch(agent) === "*";
}
function compilePathRule(type, path) {
  const decoded = safeDecodePath(path);
  return {
    type: type === "allow" ? "ALLOW" : "DISALLOW",
    path: decoded,
    regex: toRegExpPath(decoded)
  };
}
function safeDecodePath(path) {
  try {
    return (0, import_robots_linter.decodePath)(path);
  } catch {
    return path;
  }
}
function matchCompiledPathRules(path, rules, excludeIndex = -1) {
  if (path === "/robots.txt") {
    return { allowed: true, ruleIndex: -1 };
  }
  const decoded = safeDecodePath(path);
  const matches = [];
  for (let index = 0; index < rules.length; index++) {
    if (index === excludeIndex) {
      continue;
    }
    const rule = rules[index];
    if (rule.regex.test(decoded)) {
      matches.push({ rule, index });
    }
  }
  if (matches.length === 0) {
    return { allowed: true, ruleIndex: -1 };
  }
  const winner = matches.sort(bySpecificity)[0];
  return {
    allowed: winner.rule.type === "ALLOW",
    ruleIndex: winner.index
  };
}
function bySpecificity(a, b) {
  if (a.rule.path.length !== b.rule.path.length) {
    return b.rule.path.length - a.rule.path.length;
  }
  if (a.rule.type !== b.rule.type) {
    return a.rule.type === "ALLOW" ? -1 : 1;
  }
  return 0;
}
function groupMatchesUserAgent(groupAgents, userAgent, mode) {
  if (mode === "star") {
    return groupAgents.some((agent) => isStarUserAgent(agent));
  }
  return groupAgents.some(
    (agent) => !isStarUserAgent(agent) && userAgentMatches(agent, userAgent)
  );
}
function findApplicableGroups(doc, userAgent) {
  const groups = doc.groups.map((group) => ({
    group,
    agents: group.userAgents.length > 0 ? group.userAgents : ["*"]
  }));
  const specificGroups = groups.filter(
    ({ agents }) => groupMatchesUserAgent(agents, userAgent, "specific")
  );
  const applicable = specificGroups.length > 0 ? specificGroups : groups.filter(({ agents }) => groupMatchesUserAgent(agents, userAgent, "star"));
  return applicable.map(({ group }) => group);
}
function checkRobotsPath(robotsTxt, userAgent, path, doc = parseRobotsTxt(robotsTxt)) {
  const directives = findApplicableGroups(doc, userAgent).flatMap(
    (group) => group.directives.filter((directive) => directive.type === "allow" || directive.type === "disallow")
  );
  const compiled = directives.map(
    (directive) => compilePathRule(directive.type === "allow" ? "allow" : "disallow", directive.value)
  );
  const { allowed, ruleIndex } = matchCompiledPathRules(path, compiled);
  const winner = ruleIndex >= 0 ? directives[ruleIndex] : null;
  if (!winner) {
    return { ...DEFAULT_MATCH };
  }
  return {
    allowed,
    matchedPattern: winner.value,
    matchedRuleType: winner.type === "allow" ? "allow" : "disallow",
    matchingLine: winner.line
  };
}

// ../core/src/crawlers.ts
var CRAWLER_CATEGORY_LABELS = {
  "search": "Search engines",
  "ai-training": "AI training",
  "ai-search": "AI search",
  "ai-user": "AI user-triggered fetches"
};
var KNOWN_CRAWLERS = [
  { token: "Googlebot", operator: "Google", category: "search", description: "Google Search crawler" },
  { token: "Bingbot", operator: "Microsoft", category: "search", description: "Bing Search crawler (also powers Copilot answers)" },
  { token: "Applebot", operator: "Apple", category: "search", description: "Siri and Spotlight search crawler" },
  { token: "DuckDuckBot", operator: "DuckDuckGo", category: "search", description: "DuckDuckGo search crawler" },
  { token: "YandexBot", operator: "Yandex", category: "search", description: "Yandex search crawler" },
  { token: "Baiduspider", operator: "Baidu", category: "search", description: "Baidu search crawler" },
  { token: "GPTBot", operator: "OpenAI", category: "ai-training", description: "Collects content to train OpenAI models" },
  { token: "ClaudeBot", operator: "Anthropic", category: "ai-training", description: "Collects content to train Anthropic models" },
  { token: "Google-Extended", operator: "Google", category: "ai-training", description: "Controls use of Googlebot-crawled content for Gemini training and grounding; does not affect Google Search", controlToken: true },
  { token: "Applebot-Extended", operator: "Apple", category: "ai-training", description: "Controls use of Applebot-crawled content for Apple AI training", controlToken: true },
  { token: "CCBot", operator: "Common Crawl", category: "ai-training", description: "Open web crawl widely used as AI training data" },
  { token: "Meta-ExternalAgent", operator: "Meta", category: "ai-training", description: "Collects content to train Meta AI models" },
  { token: "Bytespider", operator: "ByteDance", category: "ai-training", description: "Collects content for ByteDance AI models" },
  { token: "Amazonbot", operator: "Amazon", category: "ai-training", description: "Amazon crawler used for Alexa and AI services" },
  { token: "OAI-SearchBot", operator: "OpenAI", category: "ai-search", description: "Indexes pages for ChatGPT search results" },
  { token: "Claude-SearchBot", operator: "Anthropic", category: "ai-search", description: "Indexes pages for Claude search results" },
  { token: "PerplexityBot", operator: "Perplexity", category: "ai-search", description: "Indexes pages for Perplexity answers" },
  { token: "ChatGPT-User", operator: "OpenAI", category: "ai-user", description: "Fetches pages when a ChatGPT user asks about them" },
  { token: "Claude-User", operator: "Anthropic", category: "ai-user", description: "Fetches pages when a Claude user asks about them" },
  { token: "Perplexity-User", operator: "Perplexity", category: "ai-user", description: "Fetches pages when a Perplexity user asks about them" }
];
var TOKEN_REPLACEMENTS = {
  anthropicai: "ClaudeBot",
  claudeweb: "ClaudeBot",
  claude: "ClaudeBot",
  chatgpt: "GPTBot (training) or ChatGPT-User (user fetches)",
  openai: "GPTBot",
  bard: "Google-Extended",
  gemini: "Google-Extended",
  googlebard: "Google-Extended",
  perplexity: "PerplexityBot",
  facebookbot: "Meta-ExternalAgent"
};
function collectUserAgentLines(doc) {
  const result = [];
  doc.groups.forEach((group, groupIndex) => {
    for (let line = group.startLine; line <= doc.lines.length; line++) {
      const raw = doc.lines[line - 1] ?? "";
      const content = stripComment(raw);
      if (!content) {
        continue;
      }
      if (!isUserAgentLineContent(raw)) {
        break;
      }
      result.push({
        agent: content.slice(content.indexOf(":") + 1).trim(),
        line,
        groupIndex
      });
    }
  });
  return result;
}
function analyzeCrawlerAccess(doc, crawlers = KNOWN_CRAWLERS) {
  return crawlers.map((crawler) => {
    const groups = findApplicableGroups(doc, crawler.token);
    const specific = groups.some((group) => group.userAgents.some((agent) => agent.trim() !== "*"));
    const root = checkRobotsPath(doc.raw, crawler.token, "/", doc);
    const hasDisallow = groups.some(
      (group) => group.directives.some((directive) => directive.type === "disallow" && directive.value !== "")
    );
    let status = "allowed";
    if (!root.allowed) {
      status = "blocked";
    } else if (hasDisallow) {
      status = "partial";
    }
    return {
      crawler,
      status,
      matchedAgents: [...new Set(groups.flatMap((group) => group.userAgents.length ? group.userAgents : ["*"]))],
      hasSpecificGroup: specific,
      line: root.matchingLine
    };
  });
}
function findKnownCrawler(token) {
  const normalized = normalizeUserAgentForMatch(token);
  return KNOWN_CRAWLERS.find((crawler) => normalizeUserAgentForMatch(crawler.token) === normalized);
}
function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[b.length];
}
function suggestCrawlerToken(agent) {
  const value = agent.trim();
  if (!value || value === "*" || findKnownCrawler(value)) {
    return null;
  }
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const replacement = TOKEN_REPLACEMENTS[compact];
  if (replacement) {
    return replacement;
  }
  if (compact.length < 5) {
    return null;
  }
  let best = null;
  for (const crawler of KNOWN_CRAWLERS) {
    const candidate = crawler.token.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (candidate === compact) {
      return crawler.token;
    }
    const distance = levenshtein(compact, candidate);
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { token: crawler.token, distance };
    }
  }
  return best?.token ?? null;
}
function crawlerPolicyFromPreset(preset) {
  const policy = {};
  for (const crawler of KNOWN_CRAWLERS) {
    if (crawler.category === "search") {
      continue;
    }
    if (preset === "allow-all-ai") {
      policy[crawler.token] = "allow";
    } else if (preset === "block-all-ai" || crawler.category === "ai-training") {
      policy[crawler.token] = "block";
    } else {
      policy[crawler.token] = "allow";
    }
  }
  return policy;
}
var POLICY_HEADER = "# AI crawler policy";
function allowedRules(doc) {
  const rules = findApplicableGroups(doc, "*").flatMap((group) => group.directives).filter((directive) => directive.type === "allow" || directive.type === "disallow").filter((directive) => !(directive.type === "disallow" && ["/", "/*", "/*$"].includes(directive.value))).map((directive) => `${directive.type === "allow" ? "Allow" : "Disallow"}: ${directive.value}`);
  const unique = [...new Set(rules)];
  return unique.some((rule) => rule.startsWith("Disallow:")) ? unique : ["Allow: /"];
}
function applyCrawlerPolicy(doc, policy) {
  const managed = new Map(
    Object.entries(policy).map(([token, action]) => [normalizeUserAgentForMatch(token), { token, action }])
  );
  if (managed.size === 0) {
    return doc.raw;
  }
  const agentLines = collectUserAgentLines(doc);
  const removed = /* @__PURE__ */ new Set();
  doc.groups.forEach((group, groupIndex) => {
    const lines = agentLines.filter((entry) => entry.groupIndex === groupIndex);
    const managedLines = lines.filter((entry) => managed.has(normalizeUserAgentForMatch(entry.agent)));
    if (managedLines.length === 0) {
      return;
    }
    if (managedLines.length < lines.length) {
      managedLines.forEach((entry) => removed.add(entry.line));
      return;
    }
    const nextGroup = doc.groups[groupIndex + 1];
    const lastDirectiveLine = group.directives.at(-1)?.line ?? lines.at(-1).line;
    const end = nextGroup ? Math.min(nextGroup.startLine - 1, lastDirectiveLine) : lastDirectiveLine;
    for (let line = group.startLine; line <= end; line++) {
      removed.add(line);
    }
  });
  const kept = doc.lines.filter((_, index) => !removed.has(index + 1));
  const body = kept.filter((line) => !line.startsWith(POLICY_HEADER)).join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  const blocked = [...managed.values()].filter((entry) => entry.action === "block").map((entry) => entry.token);
  const allowed = [...managed.values()].filter((entry) => entry.action === "allow").map((entry) => entry.token);
  const sections = [];
  if (blocked.length) {
    sections.push([...blocked.map((token) => `User-agent: ${token}`), "Disallow: /"].join("\n"));
  }
  if (allowed.length) {
    sections.push([...allowed.map((token) => `User-agent: ${token}`), ...allowedRules(doc)].join("\n"));
  }
  const policyText = `${POLICY_HEADER} (generated by Robots.txt Optimizer)
${sections.join("\n\n")}`;
  const sitemapPattern = /^\s*sitemap\s*:/i;
  const bodyLines = body.split("\n");
  const trailingSitemaps = [];
  while (bodyLines.length && (sitemapPattern.test(bodyLines.at(-1)) || !bodyLines.at(-1).trim())) {
    const line = bodyLines.pop();
    if (line.trim()) {
      trailingSitemaps.unshift(line);
    }
  }
  const parts = [bodyLines.join("\n").trimEnd(), policyText];
  if (trailingSitemaps.length) {
    parts.push(trailingSitemaps.join("\n"));
  }
  return `${parts.filter(Boolean).join("\n\n")}
`;
}

// ../core/src/checks.ts
var RENDER_RESOURCE_PATHS = [
  "/assets/app.js",
  "/assets/style.css",
  "/static/js/main.js",
  "/static/css/main.css",
  "/js/app.js",
  "/css/site.css",
  "/_next/static/chunks/main.js",
  "/_nuxt/entry.js",
  "/build/app.js",
  "/dist/app.js",
  "/wp-includes/js/jquery/jquery.min.js",
  "/wp-content/themes/theme/style.css",
  "/wp-content/plugins/plugin/script.js",
  "/cdn/shop/t/1/assets/theme.js"
];
var RENDER_CHECK_AGENTS = ["Googlebot", "Bingbot"];
function crawlerTokenIssues(doc) {
  const issues = [];
  for (const { agent, line } of collectUserAgentLines(doc)) {
    const suggestion = suggestCrawlerToken(agent);
    if (suggestion) {
      issues.push({
        severity: "warning",
        message: `User-agent "${agent}" is not a recognized crawler token \u2014 did you mean ${suggestion}?`,
        line
      });
    }
  }
  return issues;
}
function siteBlockIssues(doc) {
  const root = checkRobotsPath(doc.raw, "*", "/", doc);
  const google = checkRobotsPath(doc.raw, "Googlebot", "/", doc);
  const issues = [];
  if (!root.allowed) {
    issues.push({
      severity: "warning",
      message: doc.sitemaps.length > 0 ? "All crawlers are blocked from the entire site, yet a sitemap is listed \u2014 this often means a staging robots.txt shipped to production" : "All crawlers are blocked from the entire site (User-agent: * / Disallow: /) \u2014 make sure this is not a staging file on production",
      line: root.matchingLine || void 0
    });
  } else if (!google.allowed) {
    issues.push({
      severity: "warning",
      message: "Googlebot is blocked from the entire site \u2014 pages will drop out of Google Search",
      line: google.matchingLine || void 0
    });
  }
  return issues;
}
function renderResourceIssues(doc) {
  const byLine = /* @__PURE__ */ new Map();
  for (const agent of RENDER_CHECK_AGENTS) {
    if (!checkRobotsPath(doc.raw, agent, "/", doc).allowed) {
      continue;
    }
    for (const path of RENDER_RESOURCE_PATHS) {
      const result = checkRobotsPath(doc.raw, agent, path, doc);
      if (result.allowed || result.matchingLine === 0) {
        continue;
      }
      const entry = byLine.get(result.matchingLine) ?? {
        pattern: result.matchedPattern,
        paths: /* @__PURE__ */ new Set(),
        agents: /* @__PURE__ */ new Set()
      };
      entry.paths.add(path);
      entry.agents.add(agent);
      byLine.set(result.matchingLine, entry);
    }
  }
  return [...byLine.entries()].map(([line, entry]) => ({
    severity: "warning",
    message: `Disallow "${entry.pattern}" blocks CSS/JavaScript that ${[...entry.agents].join(" and ")} need${entry.agents.size === 1 ? "s" : ""} to render pages (e.g. ${[...entry.paths][0]})`,
    line
  }));
}
function controlTokenIssues(doc) {
  const issues = [];
  for (const { agent, line } of collectUserAgentLines(doc)) {
    const crawler = findKnownCrawler(agent);
    if (crawler?.token === "Google-Extended") {
      const google = checkRobotsPath(doc.raw, "Googlebot", "/", doc);
      if (!google.allowed) {
        issues.push({
          severity: "warning",
          message: "Google-Extended only controls AI use of content; it is Googlebot that is blocking Google Search here",
          line
        });
      }
    }
  }
  return issues;
}
function collectCrawlabilityIssues(doc) {
  return [
    ...siteBlockIssues(doc),
    ...renderResourceIssues(doc),
    ...crawlerTokenIssues(doc),
    ...controlTokenIssues(doc)
  ];
}

// ../core/src/validate.ts
var NON_RFC_DIRECTIVES = /* @__PURE__ */ new Set(["crawldelay", "host", "contentsignal"]);
var MAX_LINE_LENGTH = 4096;
function isUnexpectedCharacterError(message) {
  return message.includes("Unexpected Character");
}
function isInvalidProductTokenError(message) {
  return message.includes("Product token MUST only contains");
}
function isUnexpectedTokenError(message) {
  return message.includes("Unexpected Token");
}
function issueFromParseError(err, doc) {
  if (!(err instanceof Error)) {
    return null;
  }
  const lineMatch = err.message.match(/line[:\s]+(\d+)/i) ?? err.message.match(/at line (\d+)/i);
  const line = lineMatch ? Number(lineMatch[1]) : void 0;
  if (line !== void 0 && (isUnexpectedCharacterError(err.message) || isInvalidProductTokenError(err.message) || isUnexpectedTokenError(err.message)) && isUserAgentLineContent(doc.lines[line - 1] ?? "")) {
    return null;
  }
  return {
    severity: "error",
    message: err.message,
    line
  };
}
function directiveNameAtLine(doc, lineNum) {
  const raw = doc.lines[lineNum - 1];
  if (raw === void 0) {
    return void 0;
  }
  const content = stripComment(raw);
  const colonIndex = content.indexOf(":");
  if (colonIndex === -1) {
    return void 0;
  }
  const name = content.slice(0, colonIndex).trim();
  return name || void 0;
}
function collectDirectiveWarnings(doc) {
  const issues = [];
  for (let i = 0; i < doc.lines.length; i++) {
    const lineNum = i + 1;
    const raw = doc.lines[i];
    const content = stripComment(raw);
    if (!content) {
      continue;
    }
    if (raw.length > MAX_LINE_LENGTH) {
      issues.push({
        severity: "warning",
        message: "Line exceeds maximum recommended length",
        line: lineNum
      });
    }
    const colonIndex = content.indexOf(":");
    if (colonIndex === -1) {
      issues.push({
        severity: "error",
        message: "Missing colon separator between directive and value",
        line: lineNum
      });
      continue;
    }
    const name = content.slice(0, colonIndex).trim();
    const normalized = normalizeDirectiveName2(name);
    if (normalized === "disalow" || normalized === "dissallow") {
      issues.push({
        severity: "warning",
        message: "Directive appears to be a typo (accepted by crawlers but non-standard)",
        line: lineNum
      });
    }
    if (normalized === "useragent" || normalized === "sitemap") {
      continue;
    }
    if (normalized === "allow" || normalized === "disallow") {
      continue;
    }
    if (NON_RFC_DIRECTIVES.has(normalized)) {
      const directiveName = directiveNameAtLine(doc, lineNum) ?? name;
      issues.push({
        severity: "warning",
        message: `Directive "${directiveName}" is recognized but not part of RFC 9309 (may be ignored by crawlers)`,
        line: lineNum
      });
      continue;
    }
    issues.push({
      severity: "warning",
      message: "Unrecognized or unparseable directive",
      line: lineNum
    });
  }
  return issues;
}
function collectSemanticIssues(doc) {
  const issues = [];
  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi];
    if (group.userAgents.length === 0 && group.directives.length > 0) {
      issues.push({
        severity: "warning",
        message: "Group has directives but no User-agent",
        line: group.startLine
      });
    }
    for (const agent of group.userAgents) {
      if (!agent.trim()) {
        issues.push({
          severity: "warning",
          message: "Empty User-agent value",
          line: group.startLine
        });
      }
    }
    const pathDirectives = group.directives.filter((d) => d.type === "allow" || d.type === "disallow");
    if (group.userAgents.length > 0 && pathDirectives.length === 0) {
      issues.push({
        severity: "warning",
        message: `User-agent group (${group.userAgents.join(", ")}) has no Allow or Disallow rules`,
        line: group.startLine
      });
    }
    for (const directive of group.directives) {
      if (directive.type === "disallow" && directive.value === "") {
        issues.push({
          severity: "warning",
          message: "Empty Disallow value allows all URLs for this user-agent",
          line: directive.line
        });
      }
    }
  }
  for (const sitemap of doc.sitemaps) {
    if (!sitemap.url) {
      issues.push({
        severity: "warning",
        message: "Empty Sitemap URL",
        line: sitemap.line
      });
    } else {
      try {
        const parsed = new URL(sitemap.url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          issues.push({
            severity: "warning",
            message: "Sitemap URL should use http or https",
            line: sitemap.line
          });
        }
      } catch {
        issues.push({
          severity: "warning",
          message: "Sitemap URL is not a valid absolute URL",
          line: sitemap.line
        });
      }
    }
  }
  return issues;
}
function dedupeIssues(issues) {
  const seen = /* @__PURE__ */ new Set();
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.line}:${issue.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
function validateRobotsDocument(doc) {
  const issues = [];
  try {
    (0, import_robots_linter2.parse)(textForLint(doc));
  } catch (err) {
    const issue = issueFromParseError(err, doc);
    if (issue) {
      issues.push(issue);
    } else if (!(err instanceof Error)) {
      issues.push({
        severity: "error",
        message: "Failed to parse robots.txt"
      });
    }
  }
  issues.push(...collectDirectiveWarnings(doc));
  issues.push(...collectSemanticIssues(doc));
  issues.push(...collectCrawlabilityIssues(doc));
  const deduped = dedupeIssues(issues);
  const ok = !deduped.some((i) => i.severity === "error");
  return { ok, issues: deduped };
}

// ../core/src/paths.ts
var DEFAULT_USER_AGENTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "*"
];
var DEFAULT_PATHS = [
  "/",
  "/admin",
  "/api/",
  "/search",
  "/private/",
  "/blog/post-1"
];

// ../core/src/analyze.ts
function summarizeDirectives(doc) {
  return doc.groups.map((group, groupIndex) => {
    const allow = [];
    const disallow = [];
    const other = [];
    for (const directive of group.directives) {
      if (directive.type === "allow") {
        allow.push(directive.value);
      } else if (directive.type === "disallow") {
        disallow.push(directive.value);
      } else {
        other.push({
          name: directive.name,
          value: directive.value,
          line: directive.line
        });
      }
    }
    return {
      groupIndex,
      userAgents: group.userAgents,
      allow,
      disallow,
      other,
      startLine: group.startLine
    };
  });
}
function simulatePaths(doc, userAgents = DEFAULT_USER_AGENTS, paths = DEFAULT_PATHS) {
  const verdicts = [];
  for (const userAgent of userAgents) {
    for (const path of paths) {
      const result = checkRobotsPath(doc.raw, userAgent, path, doc);
      verdicts.push({
        userAgent,
        path,
        allowed: result.allowed,
        matchedRule: result.matchedPattern,
        matchedRuleType: result.matchedRuleType,
        matchingLine: result.matchingLine
      });
    }
  }
  return verdicts;
}

// ../core/src/optimize.ts
function directiveKey(d) {
  return `${d.type}:${d.value}`;
}
function groupSignature(group) {
  const agents = [...group.userAgents].sort().join("|");
  const rules = group.directives.map(directiveKey).join("|");
  return `${agents}::${rules}`;
}
function findDuplicateDirectives(doc) {
  const suggestions = [];
  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi];
    const seen = /* @__PURE__ */ new Map();
    for (const directive of group.directives) {
      if (directive.type !== "allow" && directive.type !== "disallow") {
        continue;
      }
      const key = directiveKey(directive);
      if (seen.has(key)) {
        suggestions.push({
          type: "duplicate_directive",
          message: `Duplicate ${directive.type} rule "${directive.value}" in group for ${group.userAgents.join(", ") || "unknown agent"}`,
          lines: [directive.line],
          groupIndex: gi
        });
      } else {
        seen.set(key, directive.line);
      }
    }
  }
  return suggestions;
}
function findMissingUserAgent(doc) {
  return doc.groups.flatMap((group, gi) => {
    if (group.userAgents.length === 0 && group.directives.length > 0) {
      return [{
        type: "missing_user_agent",
        message: "Add `User-agent: *` before these directives \u2014 rules without a user-agent may be ignored by crawlers",
        lines: [group.startLine],
        groupIndex: gi
      }];
    }
    return [];
  });
}
function findEmptyGroups(doc) {
  return doc.groups.flatMap((group, gi) => {
    if (group.userAgents.length > 0 && group.directives.length === 0) {
      return [{
        type: "empty_group",
        message: `Group for ${group.userAgents.join(", ")} has no directives`,
        lines: [group.startLine],
        groupIndex: gi
      }];
    }
    return [];
  });
}
function findDuplicateGroups(doc) {
  const signatures = /* @__PURE__ */ new Map();
  const suggestions = [];
  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi];
    if (group.userAgents.length === 0) {
      continue;
    }
    const sig = groupSignature(group);
    const existing = signatures.get(sig);
    if (existing !== void 0) {
      suggestions.push({
        type: "duplicate_group",
        message: `Group for ${group.userAgents.join(", ")} duplicates group starting at line ${doc.groups[existing].startLine}`,
        lines: [group.startLine],
        groupIndex: gi
      });
    } else {
      signatures.set(sig, gi);
    }
  }
  return suggestions;
}
function findRedundantCatchall(doc) {
  const catchall = doc.groups.find((g) => g.userAgents.some((a) => a === "*"));
  if (!catchall) {
    return [];
  }
  const specificAgents = new Set(
    doc.groups.filter((g) => !g.userAgents.includes("*")).flatMap((g) => g.userAgents)
  );
  if (specificAgents.size === 0) {
    return [];
  }
  return [{
    type: "redundant_catchall",
    message: `Catch-all User-agent: * group may be redundant \u2014 ${specificAgents.size} specific user-agent group(s) already defined`,
    lines: [catchall.startLine],
    groupIndex: doc.groups.indexOf(catchall)
  }];
}
function pathsFromPattern(pattern) {
  if (!pattern) {
    return [];
  }
  if (pattern === "/") {
    return ["/", "/robots-dead-rule-probe/"];
  }
  if (pattern.endsWith("$")) {
    return [pattern.slice(0, -1) || "/"];
  }
  if (pattern.includes("*")) {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      return [prefix === "/" ? "/probe" : `${prefix}probe`];
    }
    return [pattern.replace("*", "probe")];
  }
  if (pattern.endsWith("/")) {
    return [pattern === "/" ? "/probe" : `${pattern}probe`, pattern.slice(0, -1) || "/"];
  }
  return [pattern, `${pattern}/probe`];
}
function probePathsForDirective(pattern, basePaths) {
  return [.../* @__PURE__ */ new Set([...basePaths, ...pathsFromPattern(pattern)])];
}
function formatPathDirective(directive) {
  const label = directive.type === "allow" ? "Allow" : "Disallow";
  return `${label}: ${directive.value}`;
}
function formatUserAgentList(agents) {
  return agents.map((agent) => `\`${agent}\``).join(", ");
}
function ruleChangesOutcome(rules, ruleIndex, probePaths2) {
  for (const path of probePaths2) {
    const withRule = matchCompiledPathRules(path, rules);
    const withoutRule = matchCompiledPathRules(path, rules, ruleIndex);
    if (withRule.allowed !== withoutRule.allowed) {
      return true;
    }
  }
  return false;
}
function supersedingDirective(pathDirectives, rules, deadRuleIndex) {
  const deadEntry = pathDirectives[deadRuleIndex];
  for (let index = 0; index < deadRuleIndex; index++) {
    if (directiveKey(pathDirectives[index].d) === directiveKey(deadEntry.d)) {
      return pathDirectives[index].d;
    }
  }
  let earliest = null;
  for (const path of pathsFromPattern(deadEntry.d.value)) {
    const result = matchCompiledPathRules(path, rules, deadRuleIndex);
    if (result.ruleIndex < 0) {
      continue;
    }
    const winner = pathDirectives[result.ruleIndex].d;
    if (earliest === null || winner.line < earliest.line) {
      earliest = winner;
    }
  }
  return earliest;
}
function findDeadRules(doc) {
  const suggestions = [];
  const baseProbePaths = [...DEFAULT_PATHS, "/test-dead-rule-probe/"];
  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi];
    const pathDirectives = [];
    for (let index = 0; index < group.directives.length; index++) {
      const directive = group.directives[index];
      if (directive.type === "allow" || directive.type === "disallow") {
        pathDirectives.push({ d: directive, index });
      }
    }
    const compiled = pathDirectives.map(({ d }) => compilePathRule(
      d.type === "allow" ? "allow" : "disallow",
      d.value
    ));
    const agents = group.userAgents.length > 0 ? group.userAgents : ["*"];
    for (let ri = 1; ri < pathDirectives.length; ri++) {
      const directive = pathDirectives[ri].d;
      const probePaths2 = probePathsForDirective(directive.value, baseProbePaths);
      if (ruleChangesOutcome(compiled, ri, probePaths2)) {
        continue;
      }
      const superseding = supersedingDirective(pathDirectives, compiled, ri);
      const supersededBy = superseding ? formatPathDirective(superseding) : "an earlier rule";
      const ruleLabel = directive.type === "allow" ? "Allow" : "Disallow";
      suggestions.push({
        type: "dead_rule",
        message: `${ruleLabel} "${directive.value}" never changes crawl outcome for ${formatUserAgentList(agents)} (superseded by ${supersededBy})`,
        lines: [directive.line],
        groupIndex: gi,
        userAgents: [...agents]
      });
    }
  }
  return suggestions;
}
function suggestOptimizations(doc) {
  return [
    ...findMissingUserAgent(doc),
    ...findEmptyGroups(doc),
    ...findDuplicateDirectives(doc),
    ...findDuplicateGroups(doc),
    ...findDeadRules(doc),
    ...findRedundantCatchall(doc)
  ];
}
function removeLinesFromDocument(doc, linesToRemove) {
  const newGroups = [];
  for (const group of doc.groups) {
    const keptDirectives = group.directives.filter((d) => !linesToRemove.has(d.line));
    if (keptDirectives.length === 0 && (group.directives.length > 0 || linesToRemove.has(group.startLine))) {
      continue;
    }
    newGroups.push({
      ...group,
      directives: keptDirectives
    });
  }
  return {
    ...doc,
    groups: newGroups
  };
}
function dedupeDirectivesInDocument(doc) {
  const newGroups = doc.groups.map((group) => {
    const seen = /* @__PURE__ */ new Set();
    const directives = group.directives.filter((d) => {
      if (d.type !== "allow" && d.type !== "disallow") {
        return true;
      }
      const key = directiveKey(d);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return { ...group, directives };
  });
  return { ...doc, groups: newGroups };
}
function addMissingUserAgents(doc) {
  return {
    ...doc,
    groups: doc.groups.map((group) => group.userAgents.length === 0 && group.directives.length > 0 ? { ...group, userAgents: ["*"] } : group)
  };
}
function mergeDuplicateGroups(doc) {
  const seen = /* @__PURE__ */ new Map();
  const merged = [];
  for (const group of doc.groups) {
    if (group.userAgents.length === 0) {
      merged.push(group);
      continue;
    }
    const sig = groupSignature(group);
    if (seen.has(sig)) {
      const existing = seen.get(sig);
      const combinedAgents = [.../* @__PURE__ */ new Set([...existing.userAgents, ...group.userAgents])];
      existing.userAgents = combinedAgents;
      continue;
    }
    const copy = { ...group, userAgents: [...group.userAgents], directives: [...group.directives] };
    seen.set(sig, copy);
    merged.push(copy);
  }
  return { ...doc, groups: merged };
}
function getGroupEndLine(doc, groupIndex) {
  const nextGroup = doc.groups[groupIndex + 1];
  if (nextGroup) {
    return nextGroup.startLine - 1;
  }
  if (doc.sitemaps.length > 0) {
    return doc.sitemaps[0].line - 1;
  }
  return doc.lines.length;
}
function computeRemovedLines(doc, optimized) {
  const removed = /* @__PURE__ */ new Set();
  const keptDirectiveLines = new Set(
    optimized.groups.flatMap((group) => group.directives.map((directive) => directive.line))
  );
  const keptSitemapLines = new Set(optimized.sitemaps.map((sitemap) => sitemap.line));
  const keptGroupStartLines = new Set(optimized.groups.map((group) => group.startLine));
  for (const group of doc.groups) {
    for (const directive of group.directives) {
      if (!keptDirectiveLines.has(directive.line)) {
        removed.add(directive.line);
      }
    }
  }
  for (const sitemap of doc.sitemaps) {
    if (!keptSitemapLines.has(sitemap.line)) {
      removed.add(sitemap.line);
    }
  }
  for (let groupIndex = 0; groupIndex < doc.groups.length; groupIndex++) {
    const group = doc.groups[groupIndex];
    if (keptGroupStartLines.has(group.startLine)) {
      continue;
    }
    for (let line = group.startLine; line <= getGroupEndLine(doc, groupIndex); line++) {
      removed.add(line);
    }
  }
  return removed;
}
function computeInsertions(doc, optimized) {
  const insertions = /* @__PURE__ */ new Map();
  for (const optimizedGroup of optimized.groups) {
    const originalGroup = doc.groups.find((group) => group.startLine === optimizedGroup.startLine);
    if (!originalGroup) {
      continue;
    }
    if (originalGroup.userAgents.length === 0 && optimizedGroup.userAgents.length > 0) {
      insertions.set(
        optimizedGroup.startLine,
        optimizedGroup.userAgents.map((agent) => `User-agent: ${agent}`)
      );
      continue;
    }
    const extraAgents = optimizedGroup.userAgents.filter(
      (agent) => !originalGroup.userAgents.includes(agent)
    );
    if (extraAgents.length === 0) {
      continue;
    }
    const groupIndex = doc.groups.indexOf(originalGroup);
    let lastUserAgentLine = originalGroup.startLine;
    for (let line = originalGroup.startLine; line <= getGroupEndLine(doc, groupIndex); line++) {
      if (isUserAgentLineContent(doc.lines[line - 1])) {
        lastUserAgentLine = line;
      } else {
        break;
      }
    }
    insertions.set(
      lastUserAgentLine + 1,
      extraAgents.map((agent) => `User-agent: ${agent}`)
    );
  }
  return insertions;
}
function formatOptimizedFromOriginal(doc, optimized) {
  const removed = computeRemovedLines(doc, optimized);
  const insertions = computeInsertions(doc, optimized);
  const output = [];
  for (let index = 0; index < doc.lines.length; index++) {
    const lineNum = index + 1;
    const toInsert = insertions.get(lineNum);
    if (toInsert) {
      output.push(...toInsert);
    }
    if (!removed.has(lineNum)) {
      output.push(doc.lines[index]);
    }
  }
  return output.join("\n").trimEnd();
}
function buildOptimizedText(doc, suggestions) {
  const linesToRemove = /* @__PURE__ */ new Set();
  for (const suggestion of suggestions) {
    if (suggestion.type === "duplicate_directive" || suggestion.type === "dead_rule" || suggestion.type === "empty_group") {
      for (const line of suggestion.lines) {
        linesToRemove.add(line);
      }
    }
  }
  let optimized = removeLinesFromDocument(doc, linesToRemove);
  if (suggestions.some((s) => s.type === "duplicate_directive")) {
    optimized = dedupeDirectivesInDocument(optimized);
  }
  if (suggestions.some((s) => s.type === "missing_user_agent")) {
    optimized = addMissingUserAgents(optimized);
  }
  if (suggestions.some((s) => s.type === "duplicate_group")) {
    optimized = mergeDuplicateGroups(optimized);
  }
  return formatOptimizedFromOriginal(doc, optimized);
}

// ../core/src/diff.ts
var MAX_LCS_CELLS = 4e6;
function splitLines(text) {
  return text === "" ? [] : text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
}
function diffLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const result = [];
  for (let i = 0; i < start; i++) {
    result.push({ type: "same", text: a[i], oldLine: i + 1, newLine: i + 1 });
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  if (n * m > MAX_LCS_CELLS) {
    midA.forEach((text, i) => result.push({ type: "remove", text, oldLine: start + i + 1 }));
    midB.forEach((text, j) => result.push({ type: "add", text, newLine: start + j + 1 }));
  } else {
    const width = m + 1;
    const lcs = new Uint32Array((n + 1) * width);
    for (let i2 = n - 1; i2 >= 0; i2--) {
      for (let j2 = m - 1; j2 >= 0; j2--) {
        lcs[i2 * width + j2] = midA[i2] === midB[j2] ? lcs[(i2 + 1) * width + j2 + 1] + 1 : Math.max(lcs[(i2 + 1) * width + j2], lcs[i2 * width + j2 + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        result.push({ type: "same", text: midA[i], oldLine: start + i + 1, newLine: start + j + 1 });
        i++;
        j++;
      } else if (j < m && (i === n || lcs[i * width + j + 1] >= lcs[(i + 1) * width + j])) {
        result.push({ type: "add", text: midB[j], newLine: start + j + 1 });
        j++;
      } else {
        result.push({ type: "remove", text: midA[i], oldLine: start + i + 1 });
        i++;
      }
    }
  }
  for (let k = 0; k < a.length - endA; k++) {
    result.push({ type: "same", text: a[endA + k], oldLine: endA + k + 1, newLine: endB + k + 1 });
  }
  return result;
}

// ../core/src/compare.ts
function namedAgents(doc) {
  return doc.groups.flatMap((group) => group.userAgents).filter((agent) => agent.trim());
}
function samplePathForPattern(pattern) {
  const concrete = pattern.replace(/\$$/, "").replace(/\*+/g, "x");
  if (!concrete) {
    return null;
  }
  return concrete.startsWith("/") ? concrete : `/${concrete}`;
}
function probePaths(doc) {
  return doc.groups.flatMap((group) => group.directives).filter((directive) => directive.type === "allow" || directive.type === "disallow").map((directive) => samplePathForPattern(directive.value)).filter((path) => path !== null);
}
function compareRobotsTxt(beforeText, afterText, options = {}) {
  const before = parseRobotsTxt(beforeText);
  const after = parseRobotsTxt(afterText);
  const userAgents = [.../* @__PURE__ */ new Set([
    ...options.userAgents ?? DEFAULT_USER_AGENTS,
    ...namedAgents(before),
    ...namedAgents(after)
  ])];
  const paths = [.../* @__PURE__ */ new Set([
    ...options.paths ?? DEFAULT_PATHS,
    ...probePaths(before),
    ...probePaths(after)
  ])];
  const verdictChanges = [];
  for (const userAgent of userAgents) {
    for (const path of paths) {
      const a = checkRobotsPath(beforeText, userAgent, path, before);
      const b = checkRobotsPath(afterText, userAgent, path, after);
      if (a.allowed !== b.allowed) {
        verdictChanges.push({
          userAgent,
          path,
          before: a.allowed,
          after: b.allowed,
          beforeRule: a.matchedPattern,
          afterRule: b.matchedPattern,
          beforeLine: a.matchingLine,
          afterLine: b.matchingLine
        });
      }
    }
  }
  const beforeAccess = analyzeCrawlerAccess(before);
  const afterAccess = analyzeCrawlerAccess(after);
  const crawlerChanges = beforeAccess.flatMap((entry, index) => {
    const next = afterAccess[index];
    return entry.status === next.status ? [] : [{ crawler: entry.crawler, before: entry.status, after: next.status }];
  });
  return {
    diff: diffLines(beforeText, afterText),
    verdictChanges,
    crawlerChanges,
    checkedUserAgents: userAgents,
    checkedPaths: paths
  };
}

// ../core/src/templates.ts
var SITEMAP = "Sitemap: https://example.com/sitemap.xml";
var ALLOW_ALL = `User-agent: *
Allow: /

${SITEMAP}
`;
var BASE_TEMPLATES = [
  {
    id: "allow-all",
    name: "Allow everything",
    description: "Let every crawler access the whole site and point them to your sitemap",
    text: ALLOW_ALL
  },
  {
    id: "staging",
    name: "Staging / block everything",
    description: "Keep a staging or preview environment out of every crawler. Never ship this to production.",
    text: `# Staging environment \u2014 do not deploy to production
User-agent: *
Disallow: /
`
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Block the admin area and internal search while keeping admin-ajax and theme assets crawlable",
    text: `User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /?s=
Disallow: /search/

Sitemap: https://example.com/wp-sitemap.xml
`
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Shopify defaults for cart, checkout, account, and faceted collection URLs (edit via robots.txt.liquid)",
    text: `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkouts/
Disallow: /checkout
Disallow: /account
Disallow: /search
Disallow: /collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /*/collections/*sort_by*
Disallow: /policies/
Disallow: /*preview_theme_id*
Disallow: /*preview_script_id*

${SITEMAP}
`
  },
  {
    id: "nextjs",
    name: "Next.js",
    description: "Block API routes but keep /_next/ assets crawlable so pages render (or generate from app/robots.ts)",
    text: `User-agent: *
Allow: /
Disallow: /api/

${SITEMAP}
`
  },
  {
    id: "nuxt",
    name: "Nuxt",
    description: "Block server API routes but keep /_nuxt/ assets crawlable (or manage with @nuxtjs/robots)",
    text: `User-agent: *
Allow: /
Disallow: /api/

${SITEMAP}
`
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Keep product and category pages crawlable while blocking cart, checkout, and infinite filter URLs",
    text: `User-agent: *
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /search
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*sessionid=

${SITEMAP}
`
  }
];

// ../core/src/sitemap.ts
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
function decodeXmlText(value) {
  const cdata = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  const text = cdata ? cdata[1] : value;
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name]).replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec))).trim();
}
function parseSitemapXml(xml) {
  const root = xml.match(/<(?:[\w-]+:)?(urlset|sitemapindex)[\s>]/i);
  if (!root) {
    return { kind: "invalid", locs: [] };
  }
  const locs = [];
  const locPattern = /<(?:[\w-]+:)?loc>([\s\S]*?)<\/(?:[\w-]+:)?loc>/gi;
  for (const match of xml.matchAll(locPattern)) {
    const loc = decodeXmlText(match[1]);
    if (loc) {
      locs.push(loc);
    }
  }
  return { kind: root[1].toLowerCase(), locs };
}
var SITEMAP_CHECK_AGENTS = ["Googlebot", "Bingbot"];
function pathOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
function findBlockedSitemapUrls(doc, urls, userAgents = SITEMAP_CHECK_AGENTS) {
  const conflicts = [];
  for (const url of urls) {
    const path = pathOf(url);
    if (!path) {
      continue;
    }
    for (const userAgent of userAgents) {
      const result = checkRobotsPath(doc.raw, userAgent, path, doc);
      if (!result.allowed) {
        conflicts.push({
          url,
          path,
          userAgent,
          matchedRule: result.matchedPattern,
          line: result.matchingLine
        });
      }
    }
  }
  return conflicts;
}

// ../core/src/index.ts
function analyzeRobotsTxt(text) {
  const document = parseRobotsTxt(text);
  const validation = validateRobotsDocument(document);
  const directiveSummary = summarizeDirectives(document);
  const pathSimulation = simulatePaths(document);
  const suggestions = suggestOptimizations(document);
  const optimizedText = buildOptimizedText(document, suggestions);
  const crawlerAccess = analyzeCrawlerAccess(document);
  return {
    document,
    validation,
    directiveSummary,
    pathSimulation,
    suggestions,
    optimizedText,
    crawlerAccess
  };
}

// ../core/src/fetch/errors.ts
var RobotsUrlError = class extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.name = "RobotsUrlError";
    this.code = code;
  }
};
var RobotsFetchSecurityError = class extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.name = "RobotsFetchSecurityError";
    this.code = code;
  }
};
var RobotsFetchError = class extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.name = "RobotsFetchError";
    this.code = code;
  }
};

// ../core/src/fetch/fetch-robots.ts
var DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
var DEFAULT_TIMEOUT_MS = 1e4;
async function fetchRobotsTxt(url, options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const source = options.source ?? "client";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: options.accept ?? "text/plain,*/*",
        ...options.userAgent ? { "User-Agent": options.userAgent } : {}
      },
      redirect: "follow"
    });
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxBytes) {
      throw new RobotsFetchError("robots.txt response is too large", "TOO_LARGE");
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new RobotsFetchError("robots.txt response is too large", "TOO_LARGE");
    }
    const bytes = new Uint8Array(buffer);
    const hasBom = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const finalUrl = response.url || url.toString();
    return {
      text,
      finalUrl,
      status: response.status,
      contentType: response.headers.get("content-type"),
      source,
      redirected: response.redirected || finalUrl !== url.toString(),
      bytes: buffer.byteLength,
      hasBom
    };
  } catch (err) {
    if (err instanceof RobotsFetchError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new RobotsFetchError("Request timed out", "TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

// ../core/src/fetch/normalize-url.ts
function normalizeRobotsUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new RobotsUrlError("URL is required", "MISSING_URL");
  }
  let parsed;
  try {
    if (trimmed.includes("://")) {
      parsed = new URL(trimmed);
    } else {
      parsed = new URL(`https://${trimmed}`);
    }
  } catch {
    throw new RobotsUrlError("Invalid URL", "INVALID_URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new RobotsUrlError("Only http and https URLs are allowed", "UNSUPPORTED_PROTOCOL");
  }
  if (parsed.pathname === "/" || !parsed.pathname.endsWith("robots.txt")) {
    parsed.pathname = "/robots.txt";
    parsed.search = "";
    parsed.hash = "";
  }
  return parsed;
}

// ../core/src/fetch/diagnose.ts
var GOOGLE_MAX_ROBOTS_BYTES = 500 * 1024;
function looksLikeHtml(text) {
  const head = text.slice(0, 512).trimStart().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.includes("<head");
}
function formatBytes(bytes) {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${bytes} bytes`;
}
function statusDiagnostic(status) {
  if (status >= 200 && status < 300) {
    return { severity: "ok", title: `HTTP ${status}`, detail: "Crawlers will read and apply this file." };
  }
  if (status === 429 || status >= 500) {
    return {
      severity: "error",
      title: `HTTP ${status} \u2014 crawlers treat the site as fully blocked`,
      detail: "Google stops crawling the whole site while robots.txt returns a server error, then falls back to its last cached copy for up to 30 days. Fix the server response."
    };
  }
  if (status >= 400) {
    return {
      severity: "warning",
      title: `HTTP ${status} \u2014 crawlers assume there are no restrictions`,
      detail: 'A 4xx response means "no robots.txt", so every URL may be crawled. That is fine if intended; otherwise serve the file with HTTP 200.'
    };
  }
  return {
    severity: "warning",
    title: `HTTP ${status}`,
    detail: "Unexpected status code for robots.txt. Crawlers expect HTTP 200."
  };
}
function diagnoseFetch(result, requestedUrl) {
  const diagnostics = [statusDiagnostic(result.status)];
  const ok = result.status >= 200 && result.status < 300;
  if (result.redirected) {
    let crossHost = false;
    let finalPath = "";
    try {
      const final = new URL(result.finalUrl);
      finalPath = final.pathname;
      crossHost = requestedUrl ? new URL(requestedUrl).host !== final.host : false;
    } catch {
    }
    if (finalPath && !finalPath.endsWith("/robots.txt")) {
      diagnostics.push({
        severity: "error",
        title: "Redirects away from robots.txt",
        detail: `The request ended at ${result.finalUrl}. Crawlers will try to parse that page as robots.txt, which usually means no rules apply.`
      });
    } else {
      diagnostics.push({
        severity: "info",
        title: crossHost ? "Redirects to another host" : "Redirected",
        detail: `Served from ${result.finalUrl}. Google follows up to 5 redirects; the rules still apply to the original host.`
      });
    }
  }
  if (!ok) {
    return diagnostics;
  }
  const type = result.contentType?.split(";")[0]?.trim().toLowerCase() ?? null;
  if (looksLikeHtml(result.text)) {
    diagnostics.push({
      severity: "error",
      title: "Response is an HTML page",
      detail: "The server returned HTML (often a soft-404 or SPA fallback) instead of a plain-text robots.txt, so crawlers find no valid rules."
    });
  } else if (type && type !== "text/plain") {
    diagnostics.push({
      severity: "warning",
      title: `Content-Type is ${type}`,
      detail: "Serve robots.txt as text/plain. Most crawlers still parse it, but some reject other types."
    });
  }
  const bytes = result.bytes ?? new TextEncoder().encode(result.text).byteLength;
  if (bytes > GOOGLE_MAX_ROBOTS_BYTES) {
    diagnostics.push({
      severity: "error",
      title: `File is ${formatBytes(bytes)} \u2014 over Google's 500 KiB limit`,
      detail: "Google ignores everything after the first 500 KiB. Consolidate rules so the important ones come first."
    });
  } else if (!result.text.trim()) {
    diagnostics.push({
      severity: "warning",
      title: "File is empty",
      detail: "An empty robots.txt allows crawling of every URL."
    });
  } else {
    diagnostics.push({ severity: "ok", title: `Size ${formatBytes(bytes)}`, detail: "Well under Google's 500 KiB limit." });
  }
  if (result.hasBom) {
    diagnostics.push({
      severity: "info",
      title: "Starts with a UTF-8 byte order mark",
      detail: "Google ignores the BOM, but some crawlers misread the first line. Saving without a BOM is safer."
    });
  }
  return diagnostics;
}

// ../core/src/fetch/node.ts
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

// ../core/src/fetch/sitemap-node.ts
import { gunzipSync } from "node:zlib";
var DEFAULTS = {
  maxSitemaps: 10,
  maxUrls: 5e3,
  maxBytes: 10 * 1024 * 1024,
  timeoutMs: 1e4
};
function isGzip(bytes) {
  return bytes[0] === 31 && bytes[1] === 139;
}
async function readCapped(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Sitemap is larger than ${Math.round(maxBytes / 1024 / 1024)} MiB`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
async function secureFetchSitemaps(sitemapUrls, options = {}) {
  const limits = { ...DEFAULTS, ...options };
  const fetchImpl = options.allowPrivateHosts ? options.fetch ?? globalThis.fetch : createGuardedFetch(options.fetch);
  const queue = [...new Set(sitemapUrls)];
  const visited = /* @__PURE__ */ new Set();
  const urls = /* @__PURE__ */ new Set();
  const sitemaps = [];
  let truncated = false;
  while (queue.length > 0) {
    if (sitemaps.length >= limits.maxSitemaps || urls.size >= limits.maxUrls) {
      truncated = true;
      break;
    }
    const url = queue.shift();
    if (visited.has(url)) {
      continue;
    }
    visited.add(url);
    const entry = { url, status: null, kind: null, urlCount: 0 };
    sitemaps.push(entry);
    try {
      const response = await fetchImpl(url, {
        headers: { "Accept": "application/xml,text/xml,*/*", "User-Agent": SERVER_USER_AGENT },
        signal: AbortSignal.timeout(limits.timeoutMs)
      });
      entry.status = response.status;
      if (!response.ok) {
        await response.body?.cancel();
        entry.error = `HTTP ${response.status}`;
        continue;
      }
      let bytes = await readCapped(response, limits.maxBytes);
      if (isGzip(bytes)) {
        bytes = gunzipSync(bytes, { maxOutputLength: limits.maxBytes });
      }
      const parsed = parseSitemapXml(new TextDecoder().decode(bytes));
      entry.kind = parsed.kind;
      if (parsed.kind === "invalid") {
        entry.error = "Not a sitemap: expected <urlset> or <sitemapindex>";
      } else if (parsed.kind === "sitemapindex") {
        entry.urlCount = parsed.locs.length;
        queue.push(...parsed.locs.filter((loc) => !visited.has(loc)));
      } else {
        entry.urlCount = parsed.locs.length;
        for (const loc of parsed.locs) {
          if (urls.size >= limits.maxUrls) {
            truncated = true;
            break;
          }
          urls.add(loc);
        }
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.name === "TimeoutError" ? "Request timed out" : err.message : "Failed to fetch sitemap";
    }
  }
  if (queue.some((url) => !visited.has(url))) {
    truncated = true;
  }
  return { sitemaps, urls: [...urls], truncated };
}

// ../core/src/fetch/node.ts
function isPrivateIp(ip) {
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0.0.0.0") {
    return true;
  }
  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    if (normalized.startsWith("fe80")) {
      return true;
    }
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return true;
  }
  const a = parts[0];
  const b = parts[1];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}
async function assertPublicHost(url) {
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new RobotsFetchSecurityError(
      "Requests to local hosts are not allowed",
      "LOCAL_HOST"
    );
  }
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new RobotsFetchSecurityError(
        "Requests to private IP addresses are not allowed",
        "PRIVATE_IP"
      );
    }
    return;
  }
  const records = await lookup(hostname, { all: true });
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new RobotsFetchSecurityError(
        "Hostname resolves to a private IP address",
        "PRIVATE_DNS"
      );
    }
  }
}
var MAX_REDIRECTS = 5;
function createGuardedFetch(baseFetch = globalThis.fetch) {
  return (async (input, init) => {
    let url = new URL(input instanceof Request ? input.url : input.toString());
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);
      const response = await baseFetch(url.toString(), { ...init, redirect: "manual" });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) {
        if (hop === 0) {
          return response;
        }
        Object.defineProperty(response, "url", { value: url.toString() });
        Object.defineProperty(response, "redirected", { value: true });
        return response;
      }
      await response.body?.cancel();
      url = new URL(location, url);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new RobotsFetchSecurityError("Redirect to a non-http(s) URL is not allowed", "UNSAFE_REDIRECT");
      }
    }
    throw new RobotsFetchError(`More than ${MAX_REDIRECTS} redirects`, "TOO_MANY_REDIRECTS");
  });
}
var SERVER_USER_AGENT = "robots-txt-optimizer/1.0";

// src/run.ts
var defaultIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, text) => writeFile(path, text, "utf8"),
  fetch: globalThis.fetch
};
var HELP = `robots-txt-optimizer \u2014 validate, test, and optimize robots.txt

Usage:
  robots-txt-optimizer check <file|url> [options]
  robots-txt-optimizer optimize <file|url> [--write] [--ai <preset>]
  robots-txt-optimizer compare <before> <after> [--format text|json]
  robots-txt-optimizer crawlers <file|url> [--format text|json]

<file|url> is a local path, "-" for stdin, or a URL/domain (example.com).

check options:
  --fail-on <level>        error (default), warning, or none
  --expect-allowed <a:p>   Fail unless user-agent <a> may crawl path <p>
                           (repeatable), e.g. --expect-allowed "Googlebot:/blog"
  --expect-blocked <a:p>   Fail unless user-agent <a> is blocked from <p> (repeatable)
  --check-sitemaps         Fetch Sitemap: URLs and fail if robots.txt blocks
                           any URL they list
  --format <format>        text (default), json, or github (workflow annotations)
  --path-label <name>      File name to use in github annotations

optimize options:
  --write                  Overwrite the input file instead of printing
  --ai <preset>            Also apply an AI crawler policy:
                           block-ai-training, block-all-ai, allow-all-ai

Exit codes: 0 success, 1 check failed, 2 usage or input error.
`;
var AI_PRESETS = ["block-ai-training", "block-all-ai", "allow-all-ai"];
var UsageError = class extends Error {
};
function looksLikeUrl(input) {
  if (/^https?:\/\//i.test(input)) {
    return true;
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(input) && !/\.txt$/i.test(input);
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function loadInput(input, io) {
  if (input === "-") {
    return { text: await readStdin(), label: "stdin" };
  }
  try {
    return { text: await io.readFile(input), label: input, file: input };
  } catch (err) {
    const missing = err.code === "ENOENT";
    if (!missing || !looksLikeUrl(input)) {
      throw new UsageError(missing ? `File not found: ${input}` : `Cannot read ${input}: ${err.message}`);
    }
  }
  const url = normalizeRobotsUrl(input);
  const result = await fetchRobotsTxt(url, { fetch: io.fetch, userAgent: "robots-txt-optimizer-cli/1.0", source: "server" });
  return { text: result.status >= 200 && result.status < 300 ? result.text : "", label: result.finalUrl, fetchStatus: result.status };
}
function parseExpectation(value) {
  const index = value.indexOf(":");
  if (index <= 0 || index === value.length - 1) {
    throw new UsageError(`Expected "<user-agent>:<path>", got "${value}"`);
  }
  const path = value.slice(index + 1).trim();
  return { agent: value.slice(0, index).trim(), path: path.startsWith("/") ? path : `/${path}` };
}
function escapeAnnotation(text) {
  return text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
async function runCheck(input, values, io) {
  const failOn = values["fail-on"] ?? "error";
  if (!["error", "warning", "none"].includes(failOn)) {
    throw new UsageError(`--fail-on must be error, warning, or none (got "${failOn}")`);
  }
  const format = values.format ?? "text";
  if (!["text", "json", "github"].includes(format)) {
    throw new UsageError(`--format must be text, json, or github (got "${format}")`);
  }
  const analysis = analyzeRobotsTxt(input.text);
  const doc = analysis.document;
  const issues = analysis.validation.issues;
  const failures = [];
  const diagnostics = input.fetchStatus !== void 0 ? diagnoseFetch({ text: input.text, status: input.fetchStatus, finalUrl: input.label, contentType: null, source: "server" }).filter((d) => d.severity === "error" || d.severity === "warning") : [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") {
      failures.push({ message: `${diagnostic.title}: ${diagnostic.detail}` });
    }
  }
  const failingIssues = issues.filter(
    (issue) => failOn === "warning" || failOn === "error" && issue.severity === "error"
  );
  failures.push(...failingIssues.map((issue) => ({ message: issue.message, line: issue.line })));
  const expectations = [
    ...(values["expect-allowed"] ?? []).map((v) => ({ ...parseExpectation(v), allowed: true })),
    ...(values["expect-blocked"] ?? []).map((v) => ({ ...parseExpectation(v), allowed: false }))
  ];
  const expectationResults = expectations.map((expectation) => {
    const result = checkRobotsPath(doc.raw, expectation.agent, expectation.path, doc);
    return { ...expectation, actual: result.allowed, line: result.matchingLine, rule: result.matchedPattern };
  });
  for (const result of expectationResults) {
    if (result.actual !== result.allowed) {
      failures.push({
        message: `Expected ${result.agent} to be ${result.allowed ? "allowed" : "blocked"} on ${result.path}, but it is ${result.actual ? "allowed" : "blocked"}${result.line ? ` (line ${result.line}: ${result.rule})` : ""}`,
        line: result.line || void 0
      });
    }
  }
  let sitemapSummary = null;
  if (values["check-sitemaps"]) {
    const urls = doc.sitemaps.map((sitemap) => sitemap.url).filter((url) => /^https?:\/\//i.test(url));
    if (urls.length === 0) {
      failures.push({ message: "--check-sitemaps: no absolute Sitemap: URLs found" });
    } else {
      const report = await secureFetchSitemaps(urls, { fetch: io.fetch, allowPrivateHosts: true });
      const blocked = findBlockedSitemapUrls(doc, report.urls);
      const errors = report.sitemaps.filter((s) => s.error).map((s) => `${s.url}: ${s.error}`);
      sitemapSummary = { checked: report.urls.length, blocked, errors };
      for (const conflict of blocked) {
        failures.push({ message: `Sitemap URL ${conflict.url} is blocked for ${conflict.userAgent} by line ${conflict.line} (${conflict.matchedRule})`, line: conflict.line });
      }
      for (const error of errors) {
        failures.push({ message: `Sitemap could not be read \u2014 ${error}` });
      }
    }
  }
  const ok = failures.length === 0;
  if (format === "json") {
    io.stdout(`${JSON.stringify({
      ok,
      source: input.label,
      issues,
      diagnostics,
      expectations: expectationResults,
      sitemaps: sitemapSummary,
      failures
    }, null, 2)}
`);
    return ok ? 0 : 1;
  }
  if (format === "github") {
    const file = values["path-label"] ?? input.file ?? "robots.txt";
    const annotate = (level, message, line) => io.stdout(`::${level} file=${file}${line ? `,line=${line}` : ""},title=robots.txt::${escapeAnnotation(message)}
`);
    const failingSet = new Set(failingIssues);
    for (const issue of issues) {
      annotate(failingSet.has(issue) ? "error" : issue.severity === "error" ? "error" : "warning", issue.message, issue.line);
    }
    for (const failure of failures.filter((f) => !issues.some((issue) => issue.message === f.message))) {
      annotate("error", failure.message, failure.line);
    }
  }
  printCheckText(io, input.label, issues, failures, expectationResults.length, sitemapSummary?.checked);
  return ok ? 0 : 1;
}
function printCheckText(io, label, issues, failures, expectationCount, sitemapUrlsChecked) {
  io.stdout(`robots.txt check: ${label}
`);
  for (const issue of issues) {
    io.stdout(`  ${issue.severity === "error" ? "\u2716" : "\u26A0"} ${issue.line ? `line ${issue.line}: ` : ""}${issue.message}
`);
  }
  const issueMessages = new Set(issues.map((issue) => issue.message));
  for (const failure of failures.filter((f) => !issueMessages.has(f.message))) {
    io.stdout(`  \u2716 ${failure.message}
`);
  }
  const extras = [
    expectationCount ? `${expectationCount} expectation(s)` : "",
    sitemapUrlsChecked !== void 0 ? `${sitemapUrlsChecked} sitemap URL(s)` : ""
  ].filter(Boolean).join(", ");
  io.stdout(failures.length ? `
\u2716 ${failures.length} problem(s) failed the check
` : `
\u2714 Passed${extras ? ` (${extras})` : ""}${issues.length ? ` with ${issues.length} non-blocking issue(s)` : ""}
`);
}
async function runOptimize(input, values, io) {
  const preset = values.ai;
  if (preset && !AI_PRESETS.includes(preset)) {
    throw new UsageError(`--ai must be one of ${AI_PRESETS.join(", ")}`);
  }
  let text = analyzeRobotsTxt(input.text).optimizedText;
  if (preset) {
    text = applyCrawlerPolicy(parseRobotsTxt(text), crawlerPolicyFromPreset(preset));
  }
  text = `${text.trimEnd()}
`;
  if (values.write) {
    if (!input.file) {
      throw new UsageError("--write requires a local file input");
    }
    await io.writeFile(input.file, text);
    io.stderr(`Wrote ${input.file}
`);
  } else {
    io.stdout(text);
  }
  return 0;
}
async function runCompare(before, after, values, io) {
  const comparison = compareRobotsTxt(before.text, after.text);
  if (values.format === "json") {
    io.stdout(`${JSON.stringify({
      before: before.label,
      after: after.label,
      verdictChanges: comparison.verdictChanges,
      crawlerChanges: comparison.crawlerChanges.map((c) => ({ token: c.crawler.token, before: c.before, after: c.after })),
      diff: comparison.diff.filter((line) => line.type !== "same")
    }, null, 2)}
`);
    return 0;
  }
  io.stdout(`Comparing ${before.label} \u2192 ${after.label}

`);
  for (const line of comparison.diff.filter((l) => l.type !== "same")) {
    io.stdout(`${line.type === "add" ? "+" : "-"} ${line.text}
`);
  }
  if (comparison.crawlerChanges.length) {
    io.stdout("\nCrawler access changes:\n");
    for (const change of comparison.crawlerChanges) {
      io.stdout(`  ${change.crawler.token}: ${change.before} \u2192 ${change.after}
`);
    }
  }
  io.stdout(`
${comparison.verdictChanges.length} crawl verdict change(s)
`);
  for (const change of comparison.verdictChanges.slice(0, 50)) {
    io.stdout(`  ${change.userAgent} ${change.path}: ${change.before ? "allowed" : "blocked"} \u2192 ${change.after ? "allowed" : "blocked"}
`);
  }
  if (comparison.verdictChanges.length > 50) {
    io.stdout(`  \u2026 ${comparison.verdictChanges.length - 50} more (use --format json)
`);
  }
  return 0;
}
function runCrawlers(input, values, io) {
  const access = analyzeRobotsTxt(input.text).crawlerAccess;
  if (values.format === "json") {
    io.stdout(`${JSON.stringify(access.map((entry) => ({
      token: entry.crawler.token,
      operator: entry.crawler.operator,
      category: entry.crawler.category,
      status: entry.status,
      line: entry.line
    })), null, 2)}
`);
    return 0;
  }
  let category = "";
  for (const entry of access) {
    if (entry.crawler.category !== category) {
      category = entry.crawler.category;
      io.stdout(`
${CRAWLER_CATEGORY_LABELS[entry.crawler.category]}
`);
    }
    io.stdout(`  ${entry.crawler.token.padEnd(20)} ${entry.status}
`);
  }
  return 0;
}
async function run(argv, io = defaultIO) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        "help": { type: "boolean", short: "h" },
        "fail-on": { type: "string" },
        "expect-allowed": { type: "string", multiple: true },
        "expect-blocked": { type: "string", multiple: true },
        "check-sitemaps": { type: "boolean" },
        "format": { type: "string" },
        "path-label": { type: "string" },
        "write": { type: "boolean" },
        "ai": { type: "string" }
      }
    });
    const [command, ...args] = positionals;
    if (values.help || !command) {
      io.stdout(HELP);
      return command || values.help ? 0 : 2;
    }
    switch (command) {
      case "check":
      case "optimize":
      case "crawlers": {
        if (args.length !== 1) {
          throw new UsageError(`${command} takes exactly one <file|url>`);
        }
        const input = await loadInput(args[0], io);
        if (command === "check") return await runCheck(input, values, io);
        if (command === "optimize") return await runOptimize(input, values, io);
        return runCrawlers(input, values, io);
      }
      case "compare": {
        if (args.length !== 2) {
          throw new UsageError("compare takes <before> <after>");
        }
        const [before, after] = await Promise.all(args.map((arg) => loadInput(arg, io)));
        return await runCompare(before, after, values, io);
      }
      default:
        throw new UsageError(`Unknown command "${command}". Run with --help for usage.`);
    }
  } catch (err) {
    io.stderr(`Error: ${err instanceof Error ? err.message : String(err)}
`);
    return 2;
  }
}

// src/cli.ts
run(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
