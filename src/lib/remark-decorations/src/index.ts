import { visit, SKIP, EXIT } from "unist-util-visit";
import { map } from "unist-util-map";

const dict: Partial<Record<string, string>> = {
  important: "important",
  hint: "hint",
  note: "note",
};

type DecorationNode = {
  type: "wrapper";
};

const checkDecorationOpen = (node, rgx) => {
  return new RegExp(`^\\[!?${rgx}\\]`).test(node.value);
};

const checkDecorationClose = (node, rgx) => {
  return new RegExp(`\\[\/${rgx}\\]`).test(node.value);
};

const check = (node) => {
  return [
    "paragraph",
    "code",
    "blockquote",
    "heading",
    "mdxJsxTextElement",
    "emphasis",
  ].includes(node.type);
};

const addToStack = (stack, node, index, type) => {
  // Adding a new node!
  if (type != undefined) {
    stack.push({
      type: "wrapper",
      children: [
        {
          type: "elem",
          data: { hName: "div", hProperties: { className: "line" } },
        },
      ],
      data: {
        startIdx: index,
        hName: "div",
        hProperties: {
          className: `decoration-box ${type}`,
        },
      },
    });
  }

  stack[stack.length - 1].children.push(node);
  stack[stack.length - 1].data.endIdx = index;
};

export const remarkDecorations = () => {
  return (tree) => {
    let stack = [];
    let multiline = false;
    let isDecoration = false;
    let shouldCreateNode = false;

    visit(tree, check, (node, index, parent) => {
      let type;
      visit(node, "text", (textNode, _index, parent) => {
        Object.entries(dict).forEach(([type_, rgx]) => {
          if (checkDecorationOpen(textNode, rgx)) {
            isDecoration = true;
            shouldCreateNode = true;
            type = type_;
            if (textNode.value[1] == "!") {
              multiline = true;
            }

            textNode.value = textNode.value.replace(/\[!?\/?.*\][\n]?/i, "");

            return EXIT;
          } else if (multiline && checkDecorationClose(textNode, rgx)) {
            isDecoration = true; // last node still needs to be added
            multiline = false;
            textNode.value = textNode.value.replace(/\[!?\/?.*\][\n]?/i, "");
            return EXIT;
          }
        });
      });

      if (isDecoration || multiline) {
        addToStack(stack, node, index, shouldCreateNode ? type : undefined);
        shouldCreateNode = false;
        isDecoration = false;
      }
    });

    visit(tree, "root", (node) => {
      let offset = 0;
      stack.forEach((n) => {
        node.children[n.data.startIdx - offset] = n;

        if (n.data.endIdx - n.data.startIdx > 0) {
          node.children.splice(
            n.data.startIdx - offset + 1,
            n.data.endIdx - n.data.startIdx
          );
          offset = offset + (n.data.endIdx - n.data.startIdx);
        }
      });
      return EXIT;
    });

    return tree;
  };
};

export default remarkDecorations;
