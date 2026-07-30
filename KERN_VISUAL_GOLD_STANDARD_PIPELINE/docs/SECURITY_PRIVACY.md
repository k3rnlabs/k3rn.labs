# Security and Privacy

Landing captures may contain private features, customer data, unpublished branding, faces and authenticated state.

Requirements:

- private bucket and signed URLs;
- tenant ownership checks;
- encryption;
- retention and delete controls;
- no training reuse without opt-in;
- no public artifacts by default;
- MIME/size validation and decompression-bomb protection;
- repository read-only by default;
- no secrets in model context;
- provider/model/retention logging;
- no identification of real people in images.
