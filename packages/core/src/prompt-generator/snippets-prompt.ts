import type { IMaterialsProtocol } from '../material';
import type { NodeSchema } from '../protocols/schema';
import { getSnippetsInfo } from './handle-snippets';

export type IGenPromptSnippet = NodeSchema;

export function genSnippetsPrompt(
  materials: IMaterialsProtocol[],
  whiteList: string[],
  customSnippets: IGenPromptSnippet[],
) {
  return `## Schema Snippets

以下是一些组件使用的 schema 片段：

\`\`\`json
${JSON.stringify(getSnippetsInfo(materials, whiteList).concat(customSnippets))}
\`\`\`
`;
}
