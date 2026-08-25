# Security

Undominated.ai is a public ranking site. This repository is the **public issue tracker and landing page**, not the production codebase.

- **Product:** https://undominated.ai/
- **Security advisories:** use [GitHub security advisories](https://github.com/Lenvanderhof/Undominated.ai/security/advisories/new) on **this** repository.
- **Wrong prices, scores, or ranks:** open a [Wrong figure](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml) issue with a primary source.

Do not file a public issue for a vulnerability that would let someone alter rankings or inject content. Use the advisory form.

We do not operate inference. There is no user account database in the product. Cloudflare analytics run on the site; the companion “Ask” feature sends the question to a retrieve-then-generate path on the same origin. Details: https://undominated.ai/methodology/
