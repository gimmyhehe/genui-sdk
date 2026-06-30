import type { IMaterials } from '../material';
import type { IWhiteList } from './prompt';

export const extractSnippets = (materials: any[]) => {
  return materials
    .map((material) => material.data.materials.snippets)
    .filter((i) => i)
    .flat();
};

export const flatSnippets = (snippets: any) => {
  const result: any = [];

  snippets.forEach((snippets: any) => {
    if (snippets.group && snippets.children) {
      result.push(...flatSnippets(snippets.children));
    } else if (snippets.snippetName) {
      result.push(snippets);
    }
  });

  return result;
};

export const filterSnippets = (snippet: any, whiteList: IWhiteList) => {
  let name = snippet?.snippetName;
  if (!name) {
    return false;
  }
  const validList = whiteList.map((name) => name.toLocaleLowerCase());
  name = name.replaceAll('-', '').toLocaleLowerCase();
  return validList.includes(name);
};

export const getSnippetsInfo = (materials: IMaterials[], whiteList: IWhiteList) => {
  return flatSnippets(extractSnippets(materials))
    .filter((snippet: any) => filterSnippets(snippet, whiteList))
    .map((item: any) => item.schema);
};
