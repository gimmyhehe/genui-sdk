import type { IMaterialsMeta } from '../material';
import { genCustomActionsPrompt, type IGenPromptAction } from './action';
import { aboutThis } from './about-this';
import { genComponentsPrompt, type IGenPromptComponent } from './component';
import { genExamplesPrompt, type IGenPromptExample } from './examples';
import { genJsonSchema, genJsonSchemaPrompt } from './json-schema';
import { promptPrefix, skillPromptPrefix } from './prefix';
import { genRulesPrompt, skillRulesPrompt, targetRulesPrompt } from './rules';
import { genSnippetsPrompt, type IGenPromptSnippet } from './snippet';

export interface IGenPromptCustomConfig {
  customComponents?: IGenPromptComponent[];
  customSnippets?: IGenPromptSnippet[];
  customExamples?: IGenPromptExample[];
  customActions?: IGenPromptAction[];
}

export interface IGenPromptOptions {
  isSkill?: boolean;
  includeJsonSchema?: boolean;
  includeSnippets?: boolean;
  includeExamples?: boolean;
  includeActions?: boolean;
  includeAboutThis?: boolean;
  includeBaseRules?: boolean;
  additionRules?: string[];
}

function getExtendWhiteList(whiteList: string[], customComponents: IGenPromptComponent[]) {
  if (!Array.isArray(customComponents) || customComponents.length === 0) {
    return whiteList;
  }
  const newWhiteList = customComponents.map((component: IGenPromptComponent) => component.component);
  return [...new Set([...whiteList, ...newWhiteList])];
}

function buildPromptSections(
  materialsMeta: IMaterialsMeta,
  tgCustomConfig: IGenPromptCustomConfig | undefined,
  options?: IGenPromptOptions,
) {
  const { materials, examples, whiteList, wrapperComponent, rules: materialRules } = materialsMeta;
  const { customComponents, customSnippets, customExamples, customActions } = tgCustomConfig || {};
  const includeJsonSchema = options?.includeJsonSchema ?? true;
  const includeSnippets = options?.includeSnippets ?? true;
  const includeExamples = options?.includeExamples ?? true;
  const includeActions = options?.includeActions ?? true;
  const includeAboutThis = options?.includeAboutThis ?? true;
  const extendWhiteList = getExtendWhiteList(whiteList, customComponents || []);
  const modeRules = options?.isSkill ? skillRulesPrompt : targetRulesPrompt;
  const additionRules = [...(materialRules ?? []), ...(options?.additionRules ?? [])];

  return [
    options?.isSkill ? skillPromptPrefix : promptPrefix,
    genComponentsPrompt(materials, extendWhiteList, customComponents || []),
    includeJsonSchema ? genJsonSchemaPrompt(genJsonSchema(extendWhiteList)) : null,
    includeExamples ? genExamplesPrompt(examples.concat(customExamples || []), wrapperComponent) : null,
    includeSnippets ? genSnippetsPrompt(materials, extendWhiteList, customSnippets || []) : null,
    includeAboutThis ? aboutThis.trim() : null,
    includeActions ? genCustomActionsPrompt(customActions || []) : null,
    genRulesPrompt(modeRules, tgCustomConfig, wrapperComponent, { ...options, additionRules }),
  ].filter(Boolean);
}

export function genPrompt(
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  options?: IGenPromptOptions,
) {
  const sections = buildPromptSections(materialsMeta, tgCustomConfig, options);
  return sections.join('\n\n');
}
