# Setup Kiota v0

[![GitHub Super-Linter](https://github.com/microsoft/setup-kiota/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/microsoft/setup-kiota/actions/workflows/ci.yml/badge.svg)

This actions sets up [kiota](https://aka.ms/kiota) so it can be used in your workflow. Kiota is a modern OpenAPI based client generator that supports multiple languages.

> NOTE: This action is currently in public preview and subject to change.

## Usage

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v3

  - uses: microsoft/setup-kiota@v0.5.0

  - name: Update kiota clients in the repository
    run: kiota update -o . # for a complete documentation of the CLI commands see https://aka.ms/kiota/docs
    working-directory: src # assumes client is under the src path in your repository
```

## Parameters

The action also supports the following parameters

### version

Version of kiota to install.

```yaml
steps:
  - uses: microsoft/setup-kiota@v0.5.0
    with:
      version: latest # (default) or a version like v1.5.1
```

### includePreRelease

Whether or not to install a pre-release when available.

```yaml
steps:
  - uses: microsoft/setup-kiota@v0.5.0
    with:
      includePreRelease: false # (default) or true to use a pre-release if one is available. MUST be false when the version set to anything other than 'latest'
```

## Outputs

### path

Full path to the installed kiota executable.

```yaml
steps:
  - id: setup-kiota
    uses: microsoft/setup-kiota@v0.5.0
  - run: echo "${{ steps.setup-kiota.outputs.path }}"
  # result: /tmp/kiotabin/v1.6.1/linux-x64/kiota
```

### version

The version that was resolved during installation.

```yaml
steps:
  - id: setup-kiota
    uses: microsoft/setup-kiota@v0.5.0
  - run: echo "${{ steps.setup-kiota.outputs.version }}"
  # result: v1.6.1 or v1.6.0-preview.202309070001
```
