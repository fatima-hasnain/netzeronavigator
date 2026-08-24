# Surrogate static assets (provenance)

Files under `public/models/` are **data only** (manifests, TensorFlow.js `model.json`, weight shards). They are copied from the legacy Net Zero Navigator snapshot for local development and integration testing.

| Directory   | Source path (relative to snapshot repo) |
| ----------- | ---------------------------------------- |
| `20200224/` | `subsystems/webapp/resources/public/models/20200224/` |

**Snapshot git revision:** not recorded (source tree may be a non-git export). When copying updates, record the commit SHA here.

**Do not** copy Clojure/ClojureScript application source from the snapshot into this React project—only this `public/models/` subtree.
