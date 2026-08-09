# MIRAVA Face Technology Dossier

Status: SHORTLIST FOR BENCHMARK
Date reviewed: 2026-08-09

This is an engineering shortlist, not legal advice. Code, model weights,
training data and base-model terms are reviewed separately.

| Technology | Intended MIRAVA role | Published capability | License finding | Decision |
| --- | --- | --- | --- | --- |
| AuraFace v1 | Primary identity evaluator | ArcFace-style ResNet100 embedding model; model card publishes cross-pose benchmarks and warns about demographic limitations | Model repository declares Apache-2.0 and commercial use | Benchmark now; require pinned weight digests and MIRAVA cohort calibration |
| OpenCV SFace | Independent secondary evaluator | MobileFaceNet/SFace recognition with 5-landmark alignment | Model directory and repository publish Apache-2.0 | Benchmark as ensemble cross-check |
| DreamO v1.1 | Experimental self-hosted identity generator/restorer | Official ID task targets facial identity and reports higher fidelity than prior adapter methods, with more contamination than PuLID | Official code repository is Apache-2.0; downstream FLUX and weight terms require separate clearance | Offline benchmark only until full transitive clearance |
| InstantID | Research benchmark | Tuning-free single-image identity preservation using face embeddings and keypoints | Official repository says released checkpoints are research-only and InsightFace face models are non-commercial | Excluded from commercial production |
| InsightFace pretrained packs | Recognition baseline | Widely used ArcFace/antelope models | Official repository says pretrained models and training data are non-commercial research; commercial license required | Excluded unless licensed in writing |
| PhotoMaker V2 | Research generator benchmark | Multi-reference personalization and improved identity fidelity | Official V2 documentation says it relies on InsightFace and must comply with its license | Excluded from commercial production as-is |
| PuLID | Research generator benchmark | Identity customization with strong editability and similarity | Repository code is Apache-2.0, but the published workflow depends on InsightFace antelope assets | Excluded from commercial production as-is |
| IP-Adapter FaceID | Research generator benchmark | FaceID adapter, multi-reference support and ControlNet composition | Repository code is Apache-2.0; FaceID variants rely on external face encoders/weights whose production terms must be cleared | No production adoption without per-artifact dossier |

## Primary sources

- AuraFace model card and files: <https://huggingface.co/fal/AuraFace-v1>
- OpenCV SFace model directory: <https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface>
- DreamO official repository: <https://github.com/bytedance/DreamO>
- InstantID official repository: <https://github.com/instantX-research/InstantID>
- InsightFace official repository: <https://github.com/deepinsight/insightface>
- PhotoMaker official repository: <https://github.com/TencentARC/PhotoMaker>
- PuLID official repository: <https://github.com/ToTheBeginning/PuLID>
- IP-Adapter official repository: <https://github.com/tencent-ailab/IP-Adapter>

## Adoption rule

No GitHub star count, benchmark screenshot or permissive repository license is
sufficient. Production adoption requires:

1. source-code license;
2. every model-weight license and digest;
3. base-model commercial terms;
4. training-data statement and privacy review;
5. reproducible MIRAVA benchmark results;
6. deletion, security, latency and cost evidence.
