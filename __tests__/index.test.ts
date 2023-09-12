/**
 * Unit tests for the action's entrypoint, src/index.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as index from '../src/index'

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug')
const getInputMock = jest.spyOn(core, 'getInput')
const addPathMock = jest.spyOn(core, 'addPath')
const setFailedMock = jest.spyOn(core, 'setFailed')
const setOutputMock = jest.spyOn(core, 'setOutput')
const exportVariableMock = jest.spyOn(core, 'exportVariable')

// Mock the action's entrypoint
const runMock = jest.spyOn(index, 'run')

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          url: 'https://api.github.com/repos/microsoft/kiota/releases/120642190',
          tag_name: 'v1.6.1',
          name: 'v1.6.1',
          draft: false,
          prerelease: false,
          created_at: '2023-09-11T13:08:41Z',
          published_at: '2023-09-11T13:22:58Z'
        }
      ])
  })
) as any

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets the path output', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'version':
          return 'latest'
        case 'includePreRelease':
          return 'false'
        default:
          return ''
      }
    })

    await index.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(
        /Latest version is v\d\.\d\.\d-?(?:preview)?\.?\d{0,12}/
      )
    )
    expect(debugMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /Installing version v\d\.\d\.\d-?(?:preview)?\.?\d{0,12} .../
      )
    )
    expect(setOutputMock).toHaveBeenNthCalledWith(
      1,
      'version',
      expect.any(String)
    )
    expect(setOutputMock).toHaveBeenNthCalledWith(2, 'path', expect.any(String))
    expect(addPathMock).toHaveBeenNthCalledWith(1, expect.any(String))
    expect(exportVariableMock).toHaveBeenNthCalledWith(
      1,
      'KIOTA_TUTORIAL_ENABLED',
      'false'
    )
  })

  it('sets a failed status when version is missing', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'milliseconds':
          return 'this is not a number'
        default:
          return ''
      }
    })

    await index.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'Version input is required'
    )
  })
  it('sets a failed status when version is not latest and prerelease is set', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'version':
          return 'v1.5.1'
        case 'includePreRelease':
          return 'true'
        default:
          return ''
      }
    })

    await index.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'The includePreRelease option can only be used with the latest version'
    )
  })
  it('adds the prefix to the version when missing', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'version':
          return '1.5.1'
        default:
          return ''
      }
    })

    await index.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'version', 'v1.5.1')
  })
})
