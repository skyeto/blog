import { retext } from "retext";
import { visit } from "unist-util-visit";
import { toString } from "nlcst-to-string";
import type { Plugin } from "unified";
import type { Node } from "hast";

const check: Test = (node, index, parent) => {
  return (
    node.type == "element" && node.tagName == "p" && node.children.length > 0
  );
};

const openDoubleQuote = ['"', "“"];
const openSingleQuote = ["'", "‘"];
const pushQuote: Node = (node) => {
  if (node.children[0].type != "text") return;
  if (
    []
      .concat(openDoubleQuote, openSingleQuote)
      .reduce((acc, q) => node.children[0].value.startsWith(q) || acc, false)
  ) {
    let q = node.children[0].value[0];
    node.children[0].value = node.children[0].value.slice(1);
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          `typeset-push${openDoubleQuote.includes(q) ? "-double" : ""}-quote`,
        ],
      },
      children: [
        {
          type: "text",
          value: q,
        },
      ],
    });
  }
};

const rehypeTypeset: Plugin = () => {
  return (tree) => {
    visit(tree, check, (node, index, parent) => {
      pushQuote(node);
    });
  };
};

export default rehypeTypeset;
