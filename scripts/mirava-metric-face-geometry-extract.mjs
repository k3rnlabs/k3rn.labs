#!/usr/bin/env node

import crypto from "node:crypto"
import fs from "node:fs"
import fsp from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"


const EXPECTED_MEDIAPIPE_VERSION =
  "1.0.1"

const EXPECTED_BUNDLE_SHA256 =
  "sha256:d885630c297c0b20b1fe86096cb06291c4c8080876f27852e724f24ac603713f"

const EXPECTED_INSTRUMENTED_BUNDLE_SHA256 =
  "sha256:b164e55698dd613ebdb6ac30bde7333e8e58cde67609ea6e11acd6d55242bb77"

const EXPECTED_MODEL_SHA256 =
  "sha256:64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"

const SCHEMA_VERSION =
  "metric-face-geometry-observations/v1"

const EXPECTED_LANDMARK_COUNT =
  478

const EXPECTED_VERTEX_COUNT =
  468

const EXPECTED_VERTEX_STRIDE =
  5

const EXPECTED_TRIANGLE_COUNT =
  898

const EXPECTED_VERTEX_VALUE_COUNT =
  EXPECTED_VERTEX_COUNT
  * EXPECTED_VERTEX_STRIDE

const EXPECTED_INDEX_COUNT =
  EXPECTED_TRIANGLE_COUNT
  * 3

const DEFAULT_CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


const ORIGINAL_LISTENER =
  'this.g.attachProtoVectorListener("face_geometry",(t,e)=>{if(this.outputFacialTransformationMatrixes)for(let e of t)(t=Sr(t=ea(e),Fo,2))&&this.l.facialTransformationMatrixes.push({rows:Or(t,1)??0??0,columns:Or(t,2)??0??0,data:lr(t,3,Jt,cr()).slice()??[]});tu(this,e)})'

const INSTRUMENTED_LISTENER =
  'this.g.attachProtoVectorListener("face_geometry",(t,e)=>{if(this.outputFacialTransformationMatrixes)for(let r of t){let n=ea(r);(this.l.__faceGeometryRaw??=[]).push(n.toJSON());let i=Sr(n,Fo,2);i&&this.l.facialTransformationMatrixes.push({rows:Or(i,1)??0??0,columns:Or(i,2)??0??0,data:lr(i,3,Jt,cr()).slice()??[]})}tu(this,e)})'


function sha256Bytes(value) {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(value)
      .digest("hex")
  )
}


function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(
          (key) => [
            key,
            canonicalize(
              value[key],
            ),
          ],
        ),
    )
  }

  return value
}


function artifactDigest(value) {
  const copy = {
    ...value,
  }

  delete copy.artifactDigest

  return sha256Bytes(
    Buffer.from(
      JSON.stringify(
        canonicalize(copy),
      ),
      "utf8",
    ),
  )
}


function parseArguments(argv) {
  const result = {
    inputs: [],
    output: null,
    chrome: DEFAULT_CHROME,
    selfTest: false,
  }

  for (
    let index = 0;
    index < argv.length;
    index += 1
  ) {
    const token = argv[index]

    if (token === "--input") {
      const value =
        argv[++index]

      if (!value) {
        throw new Error(
          "--input requires LABEL=PATH",
        )
      }

      const separator =
        value.indexOf("=")

      if (separator <= 0) {
        throw new Error(
          `Invalid --input: ${value}`,
        )
      }

      const label =
        value.slice(
          0,
          separator,
        )

      const file =
        value.slice(
          separator + 1,
        )

      if (!file) {
        throw new Error(
          `Invalid --input path: ${value}`,
        )
      }

      result.inputs.push({
        label,
        file:
          path.resolve(file),
      })

      continue
    }

    if (token === "--output") {
      result.output =
        argv[++index]

      if (!result.output) {
        throw new Error(
          "--output requires a path",
        )
      }

      result.output =
        path.resolve(
          result.output,
        )

      continue
    }

    if (token === "--chrome") {
      result.chrome =
        path.resolve(
          argv[++index],
        )

      continue
    }

    if (token === "--self-test") {
      result.selfTest = true
      continue
    }

    if (
      token === "--help" ||
      token === "-h"
    ) {
      console.log(`
Usage:
  node scripts/mirava-metric-face-geometry-extract.mjs \\
    --input LABEL=/path/image.png \\
    [--input LABEL2=/path/image2.jpg ...] \\
    --output .mirava-bench/...json

Options:
  --chrome PATH
  --self-test
`)
      process.exit(0)
    }

    throw new Error(
      `Unknown argument: ${token}`,
    )
  }

  return result
}


function countOccurrences(
  text,
  token,
) {
  let count = 0
  let cursor = 0

  while (true) {
    const index =
      text.indexOf(
        token,
        cursor,
      )

    if (index < 0) {
      return count
    }

    count += 1
    cursor =
      index + token.length
  }
}


function instrumentBundle(
  original,
) {
  const occurrences =
    countOccurrences(
      original,
      ORIGINAL_LISTENER,
    )

  if (occurrences !== 1) {
    throw new Error(
      "MEDIAPIPE_INTERNAL_ANCHOR_MISMATCH: " +
      `expected 1 occurrence, found ${occurrences}`,
    )
  }

  const result =
    original.replace(
      ORIGINAL_LISTENER,
      INSTRUMENTED_LISTENER,
    )

  if (
    countOccurrences(
      result,
      INSTRUMENTED_LISTENER,
    ) !== 1
  ) {
    throw new Error(
      "INSTRUMENTED_LISTENER_NOT_UNIQUE",
    )
  }

  return result
}


function mime(file) {
  const extension =
    path.extname(file)
      .toLowerCase()

  if (
    extension === ".mjs" ||
    extension === ".js"
  ) {
    return "text/javascript; charset=utf-8"
  }

  if (extension === ".wasm") {
    return "application/wasm"
  }

  if (extension === ".task") {
    return "application/octet-stream"
  }

  if (
    extension === ".jpg" ||
    extension === ".jpeg"
  ) {
    return "image/jpeg"
  }

  if (extension === ".png") {
    return "image/png"
  }

  if (extension === ".webp") {
    return "image/webp"
  }

  return "application/octet-stream"
}


function validateRawGeometry(
  value,
  label,
) {
  if (
    !Array.isArray(value) ||
    value.length !== 2
  ) {
    throw new Error(
      `${label}: raw FaceGeometry root is invalid`,
    )
  }

  const mesh =
    value[0]

  if (
    !Array.isArray(mesh) ||
    mesh.length !== 4
  ) {
    throw new Error(
      `${label}: metric mesh structure is invalid`,
    )
  }

  const vertices =
    mesh[2]

  const indices =
    mesh[3]

  if (
    !Array.isArray(vertices) ||
    vertices.length !==
      EXPECTED_VERTEX_VALUE_COUNT
  ) {
    throw new Error(
      `${label}: expected ` +
      `${EXPECTED_VERTEX_VALUE_COUNT} XYZUV values`,
    )
  }

  if (
    !Array.isArray(indices) ||
    indices.length !==
      EXPECTED_INDEX_COUNT
  ) {
    throw new Error(
      `${label}: expected ` +
      `${EXPECTED_INDEX_COUNT} triangle indices`,
    )
  }

  for (
    let index = 0;
    index < vertices.length;
    index += 1
  ) {
    if (
      typeof vertices[index] !== "number" ||
      !Number.isFinite(
        vertices[index],
      )
    ) {
      throw new Error(
        `${label}: non-finite vertex value ${index}`,
      )
    }
  }

  for (
    let index = 0;
    index < indices.length;
    index += 1
  ) {
    const value =
      indices[index]

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value >= EXPECTED_VERTEX_COUNT
    ) {
      throw new Error(
        `${label}: invalid topology index ${index}`,
      )
    }
  }

  return {
    vertexCount:
      EXPECTED_VERTEX_COUNT,

    vertexStride:
      EXPECTED_VERTEX_STRIDE,

    triangleCount:
      EXPECTED_TRIANGLE_COUNT,
  }
}


async function runtimePaths() {
  const repoRoot =
    path.resolve(
      process.cwd(),
    )

  const requireFromRepo =
    createRequire(
      path.join(
        repoRoot,
        "package.json",
      ),
    )

  const packageEntryPath =
    requireFromRepo.resolve(
      "@mediapipe/tasks-vision",
    )

  let packageRoot =
    path.dirname(
      packageEntryPath,
    )

  let packagePath = null

  while (true) {
    const candidate =
      path.join(
        packageRoot,
        "package.json",
      )

    if (
      fs.existsSync(
        candidate,
      )
    ) {
      const candidatePackage =
        JSON.parse(
          fs.readFileSync(
            candidate,
            "utf8",
          ),
        )

      if (
        candidatePackage.name ===
        "@mediapipe/tasks-vision"
      ) {
        packagePath =
          candidate

        break
      }
    }

    const parent =
      path.dirname(
        packageRoot,
      )

    if (
      parent === packageRoot
    ) {
      break
    }

    packageRoot =
      parent
  }

  if (!packagePath) {
    throw new Error(
      "MEDIAPIPE_PACKAGE_ROOT_NOT_FOUND: " +
      packageEntryPath,
    )
  }

  return {
    repoRoot,

    requireFromRepo,

    packagePath,

    packageRoot,

    originalBundle:
      path.join(
        packageRoot,
        "vision_bundle.mjs",
      ),

    model:
      path.join(
        repoRoot,
        "public/visual-engine/vision/models/face_landmarker.task",
      ),

    wasmRoot:
      path.join(
        repoRoot,
        "public/visual-engine/vision/wasm",
      ),
  }
}


async function prepareInstrumentedBundle(
  runtime,
) {
  const packageJson =
    JSON.parse(
      await fsp.readFile(
        runtime.packagePath,
        "utf8",
      ),
    )

  if (
    packageJson.version !==
    EXPECTED_MEDIAPIPE_VERSION
  ) {
    throw new Error(
      "MEDIAPIPE_VERSION_MISMATCH: " +
      `${packageJson.version}`,
    )
  }

  const originalBytes =
    await fsp.readFile(
      runtime.originalBundle,
    )

  const originalDigest =
    sha256Bytes(
      originalBytes,
    )

  if (
    originalDigest !==
    EXPECTED_BUNDLE_SHA256
  ) {
    throw new Error(
      "MEDIAPIPE_BUNDLE_DIGEST_MISMATCH: " +
      originalDigest,
    )
  }

  const modelBytes =
    await fsp.readFile(
      runtime.model,
    )

  const modelDigest =
    sha256Bytes(
      modelBytes,
    )

  if (
    modelDigest !==
    EXPECTED_MODEL_SHA256
  ) {
    throw new Error(
      "MEDIAPIPE_MODEL_DIGEST_MISMATCH: " +
      modelDigest,
    )
  }

  const instrumented =
    instrumentBundle(
      originalBytes.toString(
        "utf8",
      ),
    )

  const instrumentedBytes =
    Buffer.from(
      instrumented,
      "utf8",
    )

  const instrumentedDigest =
    sha256Bytes(
      instrumentedBytes,
    )

  if (
    instrumentedDigest !==
    EXPECTED_INSTRUMENTED_BUNDLE_SHA256
  ) {
    throw new Error(
      "INSTRUMENTED_BUNDLE_DIGEST_MISMATCH: " +
      instrumentedDigest,
    )
  }

  const tempRoot =
    await fsp.mkdtemp(
      path.join(
        os.tmpdir(),
        "mirava-face-geometry-",
      ),
    )

  const instrumentedPath =
    path.join(
      tempRoot,
      "vision_bundle.instrumented.mjs",
    )

  await fsp.writeFile(
    instrumentedPath,
    instrumentedBytes,
  )

  return {
    packageJson,
    originalDigest,
    modelDigest,
    instrumentedDigest,
    tempRoot,
    instrumentedPath,
  }
}


async function selfTest() {
  const runtime =
    await runtimePaths()

  const prepared =
    await prepareInstrumentedBundle(
      runtime,
    )

  try {
    console.log(
      "MEDIAPIPE_VERSION=" +
      prepared.packageJson.version,
    )

    console.log(
      "ORIGINAL_BUNDLE_SHA256=" +
      prepared.originalDigest,
    )

    console.log(
      "INSTRUMENTED_BUNDLE_SHA256=" +
      prepared.instrumentedDigest,
    )

    console.log(
      "MODEL_SHA256=" +
      prepared.modelDigest,
    )

    console.log(
      "INTERNAL_ANCHOR_COUNT=1",
    )

    console.log(
      "METRIC_FACE_GEOMETRY_INSTRUMENTATION_SELF_TEST=PASS",
    )
  } finally {
    await fsp.rm(
      prepared.tempRoot,
      {
        recursive: true,
        force: true,
      },
    )
  }
}


async function extract(
  args,
) {
  if (args.inputs.length === 0) {
    throw new Error(
      "At least one --input LABEL=PATH is required",
    )
  }

  if (!args.output) {
    throw new Error(
      "--output is required",
    )
  }

  const labels =
    new Set()

  for (const input of args.inputs) {
    if (labels.has(input.label)) {
      throw new Error(
        `Duplicate label: ${input.label}`,
      )
    }

    labels.add(
      input.label,
    )

    if (
      !fs.existsSync(
        input.file,
      )
    ) {
      throw new Error(
        `MISSING_INPUT: ${input.file}`,
      )
    }
  }

  if (
    !fs.existsSync(
      args.chrome,
    )
  ) {
    throw new Error(
      `MISSING_CHROME: ${args.chrome}`,
    )
  }

  const runtime =
    await runtimePaths()

  const prepared =
    await prepareInstrumentedBundle(
      runtime,
    )

  const {
    chromium,
  } =
    runtime.requireFromRepo(
      "playwright",
    )

  const routes =
    new Map()

  for (
    const input
    of args.inputs
  ) {
    routes.set(
      `/images/${encodeURIComponent(input.label)}`,
      input.file,
    )
  }

  let server = null
  let browser = null

  try {
    server =
      http.createServer(
        async (req, res) => {
          try {
            const url =
              new URL(
                req.url,
                "http://127.0.0.1",
              )

            let file = null

            if (
              url.pathname ===
              "/mediapipe/vision_bundle.mjs"
            ) {
              file =
                prepared.instrumentedPath
            } else if (
              url.pathname ===
              "/visual-engine/vision/models/face_landmarker.task"
            ) {
              file =
                runtime.model
            } else if (
              url.pathname.startsWith(
                "/visual-engine/vision/wasm/",
              )
            ) {
              file =
                path.join(
                  runtime.wasmRoot,
                  path.basename(
                    url.pathname,
                  ),
                )
            } else if (
              routes.has(
                url.pathname,
              )
            ) {
              file =
                routes.get(
                  url.pathname,
                )
            } else if (
              url.pathname === "/"
            ) {
              res.writeHead(
                200,
                {
                  "content-type":
                    "text/html; charset=utf-8",
                },
              )

              res.end(
                "<!doctype html><html><body>MIRAVA metric face geometry diagnostic</body></html>",
              )

              return
            }

            if (!file) {
              res.writeHead(404)
              res.end("not found")
              return
            }

            const bytes =
              await fsp.readFile(
                file,
              )

            res.writeHead(
              200,
              {
                "content-type":
                  mime(file),

                "cache-control":
                  "no-store",
              },
            )

            res.end(
              bytes,
            )
          } catch (error) {
            res.writeHead(500)

            res.end(
              String(error),
            )
          }
        },
      )

    await new Promise(
      (resolve, reject) => {
        server.once(
          "error",
          reject,
        )

        server.listen(
          0,
          "127.0.0.1",
          resolve,
        )
      },
    )

    const address =
      server.address()

    if (
      !address ||
      typeof address !== "object"
    ) {
      throw new Error(
        "LOCAL_SERVER_PORT_UNAVAILABLE",
      )
    }

    const origin =
      `http://127.0.0.1:${address.port}`

    browser =
      await chromium.launch({
        headless: true,

        executablePath:
          args.chrome,
      })

    const page =
      await browser.newPage()

    await page.route(
      "**/*",
      async (route) => {
        const requestUrl =
          new URL(
            route.request().url(),
          )

        if (
          requestUrl.origin ===
          origin
        ) {
          await route.continue()
          return
        }

        await route.abort(
          "blockedbyclient",
        )
      },
    )

    await page.goto(
      origin + "/",
      {
        waitUntil:
          "domcontentloaded",
      },
    )

    const browserResult =
      await page.evaluate(
        async ({
          labels,
        }) => {
          const {
            FilesetResolver,
            FaceLandmarker,
          } =
            await import(
              "/mediapipe/vision_bundle.mjs"
            )

          const files =
            await FilesetResolver
              .forVisionTasks(
                "/visual-engine/vision/wasm",
              )

          const landmarker =
            await FaceLandmarker
              .createFromOptions(
                files,
                {
                  baseOptions: {
                    modelAssetPath:
                      "/visual-engine/vision/models/face_landmarker.task",

                    delegate:
                      "CPU",
                  },

                  runningMode:
                    "IMAGE",

                  numFaces:
                    2,

                  minFaceDetectionConfidence:
                    0.35,

                  minFacePresenceConfidence:
                    0.35,

                  minTrackingConfidence:
                    0.35,

                  outputFaceBlendshapes:
                    false,

                  outputFacialTransformationMatrixes:
                    true,
                },
              )

          const output = {}

          try {
            for (
              const label
              of labels
            ) {
              const image =
                new Image()

              image.src =
                `/images/${encodeURIComponent(label)}`

              await image.decode()

              const result =
                landmarker.detect(
                  image,
                )

              const faceCount =
                result.faceLandmarks.length

              if (
                faceCount !== 1
              ) {
                output[label] = {
                  status:
                    "UNSCORABLE",

                  reason:
                    `FACE_COUNT_${faceCount}`,

                  imageWidth:
                    image.naturalWidth,

                  imageHeight:
                    image.naturalHeight,

                  landmarkCount:
                    null,

                  landmarks:
                    null,

                  rawFaceGeometry:
                    null,

                  facialTransformationMatrix:
                    null,
                }

                continue
              }

              const points =
                result.faceLandmarks[0]

              if (
                points.length !== 478
              ) {
                throw new Error(
                  `${label}: expected 478 landmarks, found ${points.length}`,
                )
              }

              const matrix =
                result
                  .facialTransformationMatrixes?.[0]

              output[label] = {
                status:
                  "SCORABLE",

                imageWidth:
                  image.naturalWidth,

                imageHeight:
                  image.naturalHeight,

                landmarkCount:
                  points.length,

                landmarks:
                  points.map(
                    (
                      point,
                      index,
                    ) => ({
                      index,
                      x: point.x,
                      y: point.y,
                      z: point.z,
                    }),
                  ),

                rawFaceGeometry:
                  result
                    .__faceGeometryRaw?.[0]
                  ?? null,

                facialTransformationMatrix:
                  matrix
                    ? {
                        rows:
                          matrix.rows,

                        columns:
                          matrix.columns,

                        data:
                          Array.from(
                            matrix.data ?? [],
                          ),
                      }
                    : null,
              }
            }
          } finally {
            landmarker.close()
          }

          return output
        },
        {
          labels:
            args.inputs.map(
              (input) =>
                input.label,
            ),
        },
      )

    const sourceRecords = {}

    for (
      const input
      of args.inputs
    ) {
      const bytes =
        await fsp.readFile(
          input.file,
        )

      sourceRecords[
        input.label
      ] = {
        fileName:
          path.basename(
            input.file,
          ),

        contentSha256:
          sha256Bytes(
            bytes,
          ),
      }
    }

    for (
      const [
        label,
        observation,
      ]
      of Object.entries(
        browserResult,
      )
    ) {
      if (
        observation.status !==
        "SCORABLE"
      ) {
        continue
      }

      if (
        observation.landmarkCount !==
        EXPECTED_LANDMARK_COUNT
      ) {
        throw new Error(
          `${label}: landmark count contract violated`,
        )
      }

      observation.metricMesh =
        validateRawGeometry(
          observation.rawFaceGeometry,
          label,
        )
    }

    const artifact = {
      schemaVersion:
        SCHEMA_VERSION,

      purpose:
        "offline-diagnostic-not-production-gate",

      decisionSemantics:
        "none",

      gateEligible:
        false,

      thresholdEligible:
        false,

      runtime: {
        mediaPipeTasksVisionVersion:
          prepared.packageJson.version,

        originalBundleSha256:
          prepared.originalDigest,

        instrumentedBundleSha256:
          prepared.instrumentedDigest,

        modelSha256:
          prepared.modelDigest,

        chromeVersion:
          await browser.version(),

        nodeVersion:
          process.version,

        delegate:
          "CPU",

        runningMode:
          "IMAGE",

        networkPolicy:
          "local-origin-only",

        landmarkCountExpected:
          EXPECTED_LANDMARK_COUNT,

        metricMesh: {
          vertexCount:
            EXPECTED_VERTEX_COUNT,

          vertexStride:
            EXPECTED_VERTEX_STRIDE,

          layout:
            "XYZUV",

          triangleCount:
            EXPECTED_TRIANGLE_COUNT,
        },

        diagnosticDetectionCalibration: {
          minFaceDetectionConfidence:
            0.35,

          minFacePresenceConfidence:
            0.35,

          minTrackingConfidence:
            0.35,
        },

        instrumentation: {
          surface:
            "internal-mediapipe-face-geometry-proto",

          anchorOccurrencesExpected:
            1,

          publicApiContract:
            false,
        },
      },

      sources:
        sourceRecords,

      observations:
        browserResult,
    }

    artifact.artifactDigest =
      artifactDigest(
        artifact,
      )

    await fsp.mkdir(
      path.dirname(
        args.output,
      ),
      {
        recursive: true,
      },
    )

    await fsp.writeFile(
      args.output,
      JSON.stringify(
        artifact,
        null,
        2,
      ) + "\n",
      "utf8",
    )

    console.log(
      "SCHEMA_VERSION=" +
      artifact.schemaVersion,
    )

    console.log(
      "DIAGNOSTIC_ONLY=TRUE",
    )

    console.log(
      "GATE_ELIGIBLE=FALSE",
    )

    console.log(
      "MEDIAPIPE_VERSION=" +
      prepared.packageJson.version,
    )

    console.log(
      "ORIGINAL_BUNDLE_SHA256=" +
      prepared.originalDigest,
    )

    console.log(
      "INSTRUMENTED_BUNDLE_SHA256=" +
      prepared.instrumentedDigest,
    )

    console.log(
      "MODEL_SHA256=" +
      prepared.modelDigest,
    )

    for (
      const [
        label,
        observation,
      ]
      of Object.entries(
        browserResult,
      )
    ) {
      console.log()
      console.log(
        `CANDIDATE=${label}`,
      )

      console.log(
        "STATUS=" +
        observation.status,
      )

      if (
        observation.status ===
        "SCORABLE"
      ) {
        console.log(
          "LANDMARK_COUNT=" +
          observation.landmarkCount,
        )

        console.log(
          "METRIC_VERTEX_COUNT=" +
          observation.metricMesh
            .vertexCount,
        )

        console.log(
          "METRIC_TRIANGLE_COUNT=" +
          observation.metricMesh
            .triangleCount,
        )

        console.log(
          "TRANSFORM_MATRIX=" +
          (
            observation
              .facialTransformationMatrix
              ?.data
              ?.length
              ? "PRESENT"
              : "ABSENT"
          ),
        )
      } else {
        console.log(
          "REASON=" +
          observation.reason,
        )
      }
    }

    console.log()
    console.log(
      "ARTIFACT_DIGEST=" +
      artifact.artifactDigest,
    )

    console.log(
      "OUTPUT=" +
      args.output,
    )
  } finally {
    if (browser) {
      await browser.close()
    }

    if (server) {
      await new Promise(
        (resolve) =>
          server.close(resolve),
      )
    }

    await fsp.rm(
      prepared.tempRoot,
      {
        recursive: true,
        force: true,
      },
    )
  }
}


export {
  EXPECTED_MEDIAPIPE_VERSION,
  EXPECTED_BUNDLE_SHA256,
  EXPECTED_INSTRUMENTED_BUNDLE_SHA256,
  EXPECTED_MODEL_SHA256,
  SCHEMA_VERSION,
  EXPECTED_LANDMARK_COUNT,
  EXPECTED_VERTEX_COUNT,
  EXPECTED_VERTEX_STRIDE,
  EXPECTED_TRIANGLE_COUNT,
  EXPECTED_VERTEX_VALUE_COUNT,
  EXPECTED_INDEX_COUNT,
  ORIGINAL_LISTENER,
  INSTRUMENTED_LISTENER,
  countOccurrences,
  instrumentBundle,
  validateRawGeometry,
}


async function main() {
  const args =
    parseArguments(
      process.argv.slice(2),
    )

  if (args.selfTest) {
    await selfTest()
    return
  }

  await extract(
    args,
  )
}


const invokedDirectly =
  process.argv[1] &&
  path.resolve(
    process.argv[1],
  ) ===
    path.resolve(
      fileURLToPath(
        import.meta.url,
      ),
    )


if (invokedDirectly) {
  main().catch(
    (error) => {
      console.error(
        String(
          error?.stack ??
          error,
        ),
      )

      process.exit(1)
    },
  )
}
