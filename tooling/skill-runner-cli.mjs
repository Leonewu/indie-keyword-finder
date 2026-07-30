
const command = process.argv[2] ?? "help";
const options = parseOptions(process.argv.slice(3));

switch (command) {
  case "create": {
    const seeds = options.seed.flatMap((value) => normalizeKeywordInput(value));
    const session = createMiningSession({
      keywords: seeds,
      comparisonKeyword: options.comparison.at(-1) ?? "empty",
      country: options.country.at(-1) ?? "Global",
      maxDepth: options.depth.at(-1) ?? 2,
      timeRange: options.time.at(-1) ?? "Past 30 Days",
      maxKeywords: options.max.at(-1) ?? 200,
      maxRelatedPerKeyword: options.breadth.at(-1) ?? 5,
      threshold: options.threshold.at(-1) ?? 20,
    });
    print(advanceSession(session));
    break;
  }
  case "advance": {
    const input = await readJsonInput(options.input.at(-1));
    const observed = applyMiningObservation(input.session, {
      timelineData: input.timelineData,
      relatedPayloads: input.relatedPayloads ?? [],
    });
    print({
      ...advanceSession(observed.session),
      addedRelated: observed.addedRelated,
      addedEffective: observed.addedEffective,
    });
    break;
  }
  case "restore": {
    const input = await readJsonInput(options.input.at(-1));
    const session = restoreMiningSession(input.session ?? input);
    print({ session, restored: Boolean(session) });
    break;
  }
  case "explain":
    print({
      signal:
        "A candidate's recent average must be at least 1.5x its early average, its latest point must show material recent growth, and its latest relative signal must meet the threshold.",
      caveat:
        "This is a relative Google Trends signal, not search volume, ranking difficulty, traffic, or a guaranteed opportunity.",
      defaultDepth: 2,
      expansionPerKeyword: 5,
      laterBatchLimit: 4,
    });
    break;
  default:
    process.stdout.write(
      [
        "Indie Keyword Finder Mining runner",
        "",
        "create  --seed <keyword> [--comparison <optional-reference>] [--country Global]",
        "        [--time \"Past 30 Days\"] [--depth 2] [--breadth 5]",
        "        [--max 200] [--threshold 20]",
        "advance --input <observation.json>  # omit --input to read stdin",
        "restore --input <session.json>      # omit --input to read stdin",
        "explain",
        "",
      ].join("\n"),
    );
}

function advanceSession(session) {
  if (!session || session.status !== "running") {
    return {
      session,
      complete: session?.status === "complete",
      nextBatch: [],
      nextUrl: null,
    };
  }
  const selected = selectNextMiningBatch(session);
  return {
    session: selected.session,
    complete: selected.complete,
    nextBatch: selected.batch,
    nextUrl:
      selected.batch.length > 0
        ? buildTrendsUrl(
            [
              selected.session.referenceKeyword,
              ...selected.batch,
            ],
            selected.session,
          )
        : null,
  };
}

function parseOptions(args) {
  const result = {
    breadth: [],
    comparison: [],
    country: [],
    depth: [],
    input: [],
    max: [],
    seed: [],
    threshold: [],
    time: [],
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const name = token.slice(2);
    if (!(name in result)) throw new Error(`Unknown option: --${name}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    result[name].push(value);
    index += 1;
  }
  return result;
}

async function readJsonInput(path) {
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(path || 0, "utf8");
  return JSON.parse(text);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
