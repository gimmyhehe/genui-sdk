import fs from 'fs';
import path from 'path';
import { printBenchmarkJson, printBenchmarkSummary, printBenchmarkTable } from './reporter';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions } from './types';
import { formatBeijingDateTime, formatNumber, resolveSamplesDir, sampleStdev } from '../utils';

/** repeat ≥ 3 且该场景×模型下 n ≥ 3 时写入：与均值同量纲的样本标准差（波动）。 */
export interface BenchmarkComparisonVolatility {
  ttftMsStdev: number;
  firstObservableComponentMsStdev: number;
  totalMsStdev: number;
  /** 至少 3 个有效 TPOT 的 run 才有 */
  tpotMsStdev?: number;
  totalTokensStdev: number;
}

export interface BenchmarkComparisonRow {
  scenario: string;
  byModel: Record<
    string,
    {
      runs: number;
      avgTtftMs: number;
      /** 首个 TinyCard 节点出现耗时（ms）均值 */
      avgFirstObservableComponentMs: number;
      avgTotalMs: number;
      /** 有 TPOT 的 run 上取均值；全无则为 undefined */
      avgTpotMs?: number;
      avgTotalTokens: number;
      schemaPassRate: number;
      /** 配置 repeat ≥ 3 且本组 runs ≥ 3 时附带 */
      volatility?: BenchmarkComparisonVolatility;
    }
  >;
}

/**
 * 从结果集中提取出现过的模型列表（去重后排序）。
 * @param results 报告结果列表
 * @returns 去重并排序后的模型列表
 */
function distinctModels(results: LlmBenchmarkResultItem[]): string[] {
  return [...new Set(results.map((r) => r.model).filter(Boolean))].sort() as string[];
}

/**
 * 按场景 + 模型聚合多次 repeat，便于多模型对比。
 * @param results 报告结果列表
 * @param reportOptions 若 `repeat ≥ 3`，对 runs ≥ 3 的分组补充 `volatility`（样本标准差）。
 * @returns 按场景分组后的对比行数据
 */
export function buildComparisonByScenario(
  results: LlmBenchmarkResultItem[],
  reportOptions?: { repeat?: number },
): BenchmarkComparisonRow[] {
  const repeatCfg = reportOptions?.repeat ?? 1;
  const includeVolatility = repeatCfg >= 3;
  const scenarios = [...new Set(results.map((r) => r.scenario))].sort();
  return scenarios.map((scenario) => {
    const rows = results.filter((r) => r.scenario === scenario);
    const models = [...new Set(rows.map((r) => r.model).filter(Boolean))] as string[];
    const byModel: BenchmarkComparisonRow['byModel'] = {};
    for (const m of models) {
      const mr = rows.filter((r) => r.model === m);
      const n = mr.length;
      if (n === 0) continue;
      const tpotValues = mr.map((r) => r.tpotMs).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const ttftSeries = mr.map((r) => r.ttftMs);
      const tinyCardSeries = mr.map((r) => r.firstObservableComponentMs);
      const totalSeries = mr.map((r) => r.totalMs);
      const tokenSeries = mr.map((r) => r.totalTokens);

      const tpotStdev = tpotValues.length >= 3 ? sampleStdev(tpotValues) : undefined;
      const volatility: BenchmarkComparisonVolatility | undefined =
        includeVolatility && n >= 3
          ? {
              ttftMsStdev: sampleStdev(ttftSeries)!,
              firstObservableComponentMsStdev: sampleStdev(tinyCardSeries)!,
              totalMsStdev: sampleStdev(totalSeries)!,
              totalTokensStdev: sampleStdev(tokenSeries)!,
              ...(tpotStdev != null ? { tpotMsStdev: tpotStdev } : {}),
            }
          : undefined;

      byModel[m] = {
        runs: n,
        avgTtftMs: mr.reduce((s, r) => s + r.ttftMs, 0) / n,
        avgFirstObservableComponentMs: mr.reduce((s, r) => s + r.firstObservableComponentMs, 0) / n,
        avgTotalMs: mr.reduce((s, r) => s + r.totalMs, 0) / n,
        ...(tpotValues.length ? { avgTpotMs: tpotValues.reduce((s, v) => s + v, 0) / tpotValues.length } : {}),
        avgTotalTokens: mr.reduce((s, r) => s + r.totalTokens, 0) / n,
        schemaPassRate: mr.filter((r) => r.isSchemaJsonValidAgainstProtocol).length / n,
        ...(volatility ? { volatility } : {}),
      };
    }
    return { scenario, byModel };
  });
}

/**
 * 计算本次报告输出目录。
 * @param options 运行配置
 * @returns 报告输出目录
 */
function getReportOutputDir(options: LlmBenchmarkRunOptions) {
  if (options.outputDir) {
    return path.resolve(options.outputDir);
  }
  const samplesDir = resolveSamplesDir(options.samplesDir);
  // 按需求：report 输出到本次 runDir 根目录下
  return path.resolve(samplesDir);
}

/**
 * 生成 HTML 报告字符串（包含对比图表与明细表）。
 * @param results 报告结果列表
 * @param options 运行配置
 * @returns HTML 字符串
 */
function createReportHtml(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const comparison = buildComparisonByScenario(results, { repeat: options.repeat });
  const modelList = distinctModels(results);
  const modelListForChart = modelList.length > 0 ? modelList : [options.model];
  const payload = JSON.stringify(results);
  const comparisonPayload = JSON.stringify(comparison);
  const modelListPayload = JSON.stringify(modelListForChart);
  const modelsDisplay = modelList.length ? modelList.join(', ') : options.model;
  const beijingNow = formatBeijingDateTime(new Date(), {
    dateTimeSeparator: ' ',
    timeSeparator: ':',
  });
  const benchmarkTotalMs =
    typeof options.benchmarkStartedAtMs === 'number' ? Math.max(0, Date.now() - options.benchmarkStartedAtMs) : undefined;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GenUI Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; background: #0b1020; color: #e6ecff; }
    .card { background: #141a2f; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #253053; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #253053; padding: 8px; text-align: left; }
    .ok { color: #3ddc97; }
    .bad { color: #ff7a7a; }
    h3 { margin-top: 0; }
    .hint { opacity: 0.85; font-size: 13px; }
    .chart-card-compact { height: 340px; }
    .chart-card-compact canvas { width: 100% !important; height: 100% !important; }
  </style>
</head>
<body>
  <div class="card">
    <h2>GenUI LLM Benchmark</h2>
    <div>Models: <b>${modelsDisplay}</b></div>
    <div>Primary config model: <b>${options.model}</b></div>
    <div>Generated at (Beijing): <b>${beijingNow}</b></div>
    ${benchmarkTotalMs != null ? `<div>Total benchmark elapsed: <b>${benchmarkTotalMs} ms</b></div>` : ''}
    <div>repeat: <b>${options.repeat ?? 1}</b>${(options.repeat ?? 1) >= 3 ? '（≥3 时汇报含各场景×模型的均值与样本标准差 σ）' : ''}</div>
  </div>
  <div class="card">
    <h3>按场景 · 模型对比（多次 run 取均值）</h3>
    <p class="hint">下图包含按场景的时延/Token 对比，以及按模型的 Schema 通过率排名（百分比）。</p>
  </div>
  <div class="grid">
    <div class="card"><canvas id="compareTtftChart"></canvas></div>
    <div class="card"><canvas id="compareFirstObsChart"></canvas></div>
    <div class="card"><canvas id="compareTotalChart"></canvas></div>
    <div class="card"><canvas id="compareSchemaChart"></canvas></div>
    <div class="card"><canvas id="compareTokensChart"></canvas></div>
    <div class="card"><canvas id="compareTpotChart"></canvas></div>
  </div>
  <div class="card" id="repeatVolatilityCard" style="display:none;">
    <h3>重复运行 · 均值与样本标准差（repeat ≥ 3）</h3>
    <p class="hint">按「场景 × 模型」汇总：均值为算术平均；波动为样本标准差（同一组 runs ≥ 3）。TPOT 列仅在至少 3 个 run 有有效 TPOT 时给出 σ。</p>
    <table id="repeatVolatilityTable"></table>
  </div>
  <div class="card">
    <h3>单次运行明细（含 model · scenario · run）</h3>
  </div>
  <div class="grid">
    <div class="card"><canvas id="latencyChart"></canvas></div>
    <div class="card"><canvas id="tokenChart"></canvas></div>
    <div class="card chart-card-compact"><canvas id="validChart"></canvas></div>
  </div>
  <div class="card">
    <h3>Details</h3>
    <table id="detailTable"></table>
  </div>
  <script>
    const repeatForReport = ${JSON.stringify(options.repeat ?? 1)};
    const results = ${payload};
    const comparison = ${comparisonPayload};
    const modelList = ${modelListPayload};
    const scenarioLabels = comparison.map(function (c) { return c.scenario; });
    const barOpts = { responsive: true, plugins: { legend: { position: 'bottom' } } };

    function withTitle(baseOpts, titleText) {
      return {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          title: { display: true, text: titleText },
        },
      };
    }

    function pickScenarioCell(scenario, model) {
      var row = comparison.find(function (c) { return c.scenario === scenario; });
      return row && row.byModel[model];
    }

    function buildModelSchemaPassRanking() {
      var rows = modelList
        .map(function (m) {
          var modelRuns = results.filter(function (r) { return r.model === m; });
          if (modelRuns.length === 0) return null;
          var passCount = modelRuns.filter(function (r) { return r.isSchemaJsonValidAgainstProtocol; }).length;
          return { model: m, passRatePct: passCount / modelRuns.length * 100 };
        })
        .filter(function (x) { return x != null; })
        .sort(function (a, b) { return b.passRatePct - a.passRatePct; });
      return rows;
    }

    new Chart(document.getElementById('compareTtftChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTtftMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'TTFT（Time To First Token，首 Token 延迟）平均对比（ms）'),
    });
    new Chart(document.getElementById('compareFirstObsChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgFirstObservableComponentMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, '首个 TinyCard 出现（平均 ms）'),
    });
    new Chart(document.getElementById('compareTotalChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTotalMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'Total（端到端总耗时）平均对比（ms）'),
    });
    var schemaPassByModel = buildModelSchemaPassRanking();
    new Chart(document.getElementById('compareSchemaChart'), {
      type: 'bar',
      data: {
        labels: schemaPassByModel.map(function (x) { return x.model; }),
        datasets: [
          {
            label: 'Schema 通过率',
            data: schemaPassByModel.map(function (x) { return x.passRatePct; }),
            backgroundColor: '#5b8ff9',
          },
        ],
      },
      options: withTitle(
        {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            x: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 10,
                callback: function (value) { return value + '%'; },
              },
            },
          },
        },
        'Schema 通过率排名（按模型，%）',
      ),
    });
    new Chart(document.getElementById('compareTokensChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTotalTokens : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'Total Tokens 平均对比'),
    });
    new Chart(document.getElementById('compareTpotChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell && typeof cell.avgTpotMs === 'number' ? cell.avgTpotMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'TPOT（Time Per Output Token）平均对比（ms/token）'),
    });

    const labels = results.map(function (r) {
      var m = r.model ? r.model + ' | ' : '';
      var run = r.runIndex && r.runIndex > 1 ? '#' + r.runIndex : '';
      return m + r.scenario + run;
    });
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'TTFT(ms)', data: results.map(function (r) { return r.ttftMs; }) },
          { label: 'TinyCard 首现(ms)', data: results.map(function (r) { return r.firstObservableComponentMs; }) },
          { label: 'Total(ms)', data: results.map(function (r) { return r.totalMs; }) },
          {
            label: 'TPOT(ms/token)',
            data: results.map(function (r) {
              return typeof r.tpotMs === 'number' ? r.tpotMs : null;
            }),
          },
        ],
      },
      options: withTitle(barOpts, '单次运行：TTFT / TinyCard 首现 / Total / TPOT'),
    });
    new Chart(document.getElementById('tokenChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Prompt Tokens', data: results.map(function (r) { return r.promptTokens; }) },
          { label: 'Completion Tokens', data: results.map(function (r) { return r.completionTokens; }) },
          { label: 'Total Tokens', data: results.map(function (r) { return r.totalTokens; }) },
        ],
      },
      options: withTitle(barOpts, '单次运行：Token 消耗'),
    });
    var schemaPassByModelForValid = buildModelSchemaPassRanking();
    new Chart(document.getElementById('validChart'), {
      type: 'bar',
      data: {
        labels: schemaPassByModelForValid.map(function (x) { return x.model; }),
        datasets: [
          {
            label: 'Schema 通过率',
            data: schemaPassByModelForValid.map(function (x) { return x.passRatePct; }),
            backgroundColor: '#3ddc97',
          },
        ],
      },
      options: withTitle(
        {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            x: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 10,
                callback: function (value) { return value + '%'; },
              },
            },
          },
        },
        '单次运行样本：按模型 Schema 通过率（%）',
      ),
    });
    const headers = ['model', 'scenario', 'runIndex', 'ttftMs', 'tinyCardMs', 'totalMs', 'tpotMs', 'schema', 'schemaError', 'judgeScore', 'judgeReason', 'tokens', 'error'];
    const rows = results.map(function (r) {
      return [
        r.model || '',
        r.scenario,
        r.runIndex || 1,
        r.ttftMs.toFixed(2),
        r.firstObservableComponentMs.toFixed(2),
        r.totalMs.toFixed(2),
        typeof r.tpotMs === 'number' ? r.tpotMs.toFixed(2) : '',
        r.isSchemaJsonValidAgainstProtocol ? '<span class="ok">pass</span>' : '<span class="bad">fail</span>',
        r.schemaValidationError || '',
        typeof r.llmJudgeScore === 'number' ? r.llmJudgeScore.toFixed(2) : '',
        r.llmJudgeReason || r.llmJudgeError || '',
        r.totalTokens,
        r.errorMessage || '',
      ];
    });
    const table = document.getElementById('detailTable');
    table.innerHTML = '<tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      rows.map(function (row) {
        return '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('');

    if (repeatForReport >= 3) {
      var volHead = ['scenario', 'model', 'runs', 'avg_ttft_ms', 'σ_ttft', 'avg_tinyCard_ms', 'σ_tinyCard', 'avg_total_ms', 'σ_total', 'avg_tpot', 'σ_tpot', 'avg_tokens', 'σ_tokens'];
      var volBody = [];
      comparison.forEach(function (row) {
        Object.keys(row.byModel).forEach(function (mid) {
          var c = row.byModel[mid];
          if (!c.volatility) return;
          volBody.push([
            row.scenario,
            mid,
            String(c.runs),
            c.avgTtftMs.toFixed(2),
            c.volatility.ttftMsStdev.toFixed(2),
            c.avgFirstObservableComponentMs.toFixed(2),
            c.volatility.firstObservableComponentMsStdev.toFixed(2),
            c.avgTotalMs.toFixed(2),
            c.volatility.totalMsStdev.toFixed(2),
            typeof c.avgTpotMs === 'number' ? c.avgTpotMs.toFixed(2) : '',
            c.volatility.tpotMsStdev != null ? c.volatility.tpotMsStdev.toFixed(2) : '',
            c.avgTotalTokens.toFixed(0),
            c.volatility.totalTokensStdev.toFixed(0),
          ]);
        });
      });
      if (volBody.length > 0) {
        document.getElementById('repeatVolatilityCard').style.display = 'block';
        var vt = document.getElementById('repeatVolatilityTable');
        vt.innerHTML =
          '<tr>' +
          volHead.map(function (h) {
            return '<th>' + h + '</th>';
          }).join('') +
          '</tr>' +
          volBody
            .map(function (row) {
              return '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
            })
            .join('');
      }
    }
  </script>
</body>
</html>`;
}

/**
 * repeat ≥ 3 时在控制台输出按场景×模型的均值与样本标准差（波动）。
 */
function printRepeatVolatilityTables(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const repeatCfg = options.repeat ?? 1;
  if (repeatCfg < 3) return;
  const comparison = buildComparisonByScenario(results, { repeat: repeatCfg });
  const rows: Array<Record<string, string | number>> = [];
  for (const row of comparison) {
    for (const [modelId, cell] of Object.entries(row.byModel)) {
      if (!cell.volatility) continue;
      rows.push({
        scenario: row.scenario,
        model: modelId,
        runs: cell.runs,
        ttft_avg: formatNumber(cell.avgTtftMs, 2),
        ttft_std: formatNumber(cell.volatility.ttftMsStdev, 2),
        tiny_avg: formatNumber(cell.avgFirstObservableComponentMs, 2),
        tiny_std: formatNumber(cell.volatility.firstObservableComponentMsStdev, 2),
        total_avg: formatNumber(cell.avgTotalMs, 2),
        total_std: formatNumber(cell.volatility.totalMsStdev, 2),
        tpot_avg: typeof cell.avgTpotMs === 'number' ? formatNumber(cell.avgTpotMs, 2) : '',
        tpot_std: cell.volatility.tpotMsStdev != null ? formatNumber(cell.volatility.tpotMsStdev, 2) : '',
        tok_avg: formatNumber(cell.avgTotalTokens, 0),
        tok_std: formatNumber(cell.volatility.totalTokensStdev, 0),
      });
    }
  }
  if (rows.length === 0) {
    console.log(
      '\n[bench] repeat≥3：无 runs≥3 的场景×模型分组，未输出标准差表（请检查样本是否齐全或过滤条件）',
    );
    return;
  }
  console.log('\n重复运行 · 均值 / 样本标准差（按场景 × 模型）');
  console.table(rows);
}

/**
 * 将 JSON/HTML 报告写入磁盘到当前 run 输出目录。
 */
function writeBenchmarkArtifacts(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const outputDir = getReportOutputDir(options);
  fs.mkdirSync(outputDir, { recursive: true });

  const modelList = distinctModels(results);
  const comparisonByScenario = buildComparisonByScenario(results, { repeat: options.repeat });
  const modelsInArtifact = modelList.length > 0 ? modelList : [options.model];
  const benchmarkTotalMs =
    typeof options.benchmarkStartedAtMs === 'number' ? Math.max(0, Date.now() - options.benchmarkStartedAtMs) : undefined;

  const jsonPath = path.resolve(outputDir, 'report.json');
  const htmlPath = path.resolve(outputDir, 'report.html');

  const json = JSON.stringify(
    {
      model: options.model,
      models: modelsInArtifact,
      repeat: options.repeat ?? 1,
      benchmarkTotalMs,
      llmJudge: options.llmJudge,
      comparisonByScenario,
      generatedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  );
  const html = createReportHtml(results, options);

  fs.writeFileSync(jsonPath, json, 'utf-8');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  if (benchmarkTotalMs != null) {
    console.log(`\nTotal benchmark elapsed: ${benchmarkTotalMs} ms`);
  }
  console.log('\nReport Files');
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- HTML: ${htmlPath}`);
}

/**
 * 统一输出 benchmark 结果，支持表格与 JSON 两种格式。
 * @param results 结果集（由 samples 解析并聚合得到）
 * @param options 当前运行配置（用于展示/输出目录/过滤等）
 * @returns 输出的结果集
 */
export function printLlmBenchmarkResults(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const modelList = distinctModels(results);
  const label = modelList.length > 0 ? modelList.join(', ') : options.model;
  console.log(`\nModels: ${label}`);

  if (options.json) {
    printBenchmarkJson(results);
  } else {
    printBenchmarkTable(results);
    printBenchmarkSummary(results);
    printRepeatVolatilityTables(results, options);
  }
  writeBenchmarkArtifacts(results, options);
  return results;
}
