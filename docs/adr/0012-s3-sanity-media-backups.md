# Protect Sanity media with external S3 dataset exports

Status: accepted. Sanity Studio history is the Tier-1 recovery path for recent,
localized author mistakes; a native Sanity dataset export is the Tier-2 restore
artifact for vendor/account loss and changes beyond that history window. The
export runs nightly and on manual dispatch, and is stored in a dedicated private
S3 bucket rather than Git history so binary retention remains declarative.

## Decision

- Every run writes an overwrite-protected export to a unique UTC date-stamped S3
  key. S3 lifecycle expiration is the retention mechanism; bucket versioning is
  only a safety net for accidental overwrite or deletion.
- The GitHub Actions identity is write-only: it may upload exports but may not
  delete objects or versions, or change S3 versioning or lifecycle settings.
  Lifecycle expiration is performed by S3, not the Action.
- A compact manifest in private GitHub indexes every export by S3 key and
  SHA-256 checksum. It supports inspection and integrity verification but is not
  a restore format.
- The bucket remains private because an export can contain drafts and metadata
  that are not part of the public image set. No Object Lock, cross-account, or
  cross-cloud copy is included in v1.
- S3 expires current exports after 90 days and noncurrent versions after 90 days.
  This comfortably exceeds Sanity Free's three-day document-history window.
  GFS-by-prefix is deferred unless volume makes flat retention material or
  year-scale snapshots become an explicit need; a delete-capable pruner is not
  acceptable.

## Consequences

The exported binaries are independently recoverable from Sanity, but S3 and the
live application remain in one AWS account. The GitHub manifest survives an AWS
account loss as an index, not as a copy of the tarballs. A short-lived Asset that
is created and removed before an export remains an accepted residual risk;
manual dispatch reduces that risk around intentional media work.

The backup is not a guarantee until a native import of its latest export succeeds
in a throwaway Sanity dataset. The restore proof must be repeated periodically.
