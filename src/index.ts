import * as core from '@actions/core'
import * as path from 'path'
import * as https from 'https'
import * as fs from 'fs'
import * as os from 'os'
import AdmZip from 'adm-zip'

async function ensureKiotaIsPresent(kiotaVersion: string): Promise<void> {
  const currentPlatform = getCurrentPlatform()
  const installPath = getKiotaPathInternal(kiotaVersion, false)
  if (installPath) {
    if (!fs.existsSync(installPath)) {
      try {
        fs.mkdirSync(installPath, { recursive: true })
        const zipFilePath = `${installPath}.zip`
        await downloadFileFromUrl(
          getDownloadUrl(kiotaVersion, currentPlatform),
          zipFilePath
        )
        unzipFile(zipFilePath, installPath)
        const kiotaPath = getKiotaPathInternal(kiotaVersion)
        if (
          (currentPlatform.startsWith(linuxPlatform) ||
            currentPlatform.startsWith(osxPlatform)) &&
          kiotaPath
        ) {
          makeExecutable(kiotaPath)
        }
      } catch (error) {
        fs.rmdirSync(installPath, { recursive: true })
        throw new Error(
          'Kiota download failed. Check the extension host logs for more information.'
        )
      }
    }
  }
}

function getKiotaPath(kiotaVersion: string, withFileName = true): string {
  const kiotaPath = getKiotaPathInternal(kiotaVersion, withFileName)
  if (!kiotaPath) {
    throw new Error('Could not find kiota')
  }
  return kiotaPath
}
function makeExecutable(targetPath: string): void {
  fs.chmodSync(targetPath, 0o755)
}

const binariesRootDirectory = 'kiotabin'
function getKiotaPathInternal(
  kiotaVersion: string,
  withFileName = true
): string | undefined {
  const fileName = process.platform === 'win32' ? 'kiota.exe' : 'kiota'
  const currentPlatform = getCurrentPlatform()
  const directoryPath = path.join(
    os.tmpdir(),
    binariesRootDirectory,
    kiotaVersion,
    currentPlatform
  )
  if (withFileName) {
    return path.join(directoryPath, fileName)
  }
  return directoryPath
}

function unzipFile(zipFilePath: string, destinationPath: string): void {
  const zip = new AdmZip(zipFilePath)
  zip.extractAllTo(destinationPath, true)
}

async function downloadFileFromUrl(
  url: string,
  destinationPath: string
): Promise<void> {
  return new Promise(resolve => {
    https.get(url, response => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        resolve(downloadFileFromUrl(response.headers.location, destinationPath))
      } else {
        const filePath = fs.createWriteStream(destinationPath)
        response.pipe(filePath)
        filePath.on('finish', () => {
          filePath.close()
          resolve(undefined)
        })
      }
    })
  })
}
const baseDownloadUrl = 'https://github.com/microsoft/kiota/releases/download'
function getDownloadUrl(kiotaVersion: string, platform: string): string {
  return `${baseDownloadUrl}/${kiotaVersion}/${platform}.zip`
}

const windowsPlatform = 'win'
const osxPlatform = 'osx'
const linuxPlatform = 'linux'
function getCurrentPlatform(): string {
  const binPathSegmentOS =
    process.platform === 'win32'
      ? windowsPlatform
      : process.platform === 'darwin'
      ? osxPlatform
      : linuxPlatform
  return `${binPathSegmentOS}-${process.arch}`
}

async function getKiotaVersion(
  includePreRelease = false
): Promise<string> {
  const response = await fetch(
    'https://api.github.com/repos/microsoft/kiota/releases',
    {
      headers: {
        'User-Agent': 'kiota-action/v0.1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json'
      }
    }
  )
  if (response.ok) {
    const releases = (await response.json()) as Release[]
    const release = releases
      .filter(x => includePreRelease || !x.prerelease)
      .sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
      )[0]
    if (release) {
      return release.tag_name
    }
  }
  throw new Error('Could not get the latest kiota version')
}
interface Release {
  tag_name: string
  prerelease: boolean
  published_at: string
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    let version: string = core.getInput('version')
    const includePreReleaseRaw: string = core.getInput('includePreRelease')
    let includePreRelease = false
    if (includePreReleaseRaw) {
      includePreRelease = includePreReleaseRaw.toLowerCase() === 'true'
    }
    if (!version) {
      throw new Error('Version input is required')
    }
    version = version.trim().toLowerCase()
    if (!version.startsWith('v') && version !== 'latest') {
      version = `v${version}`
    }
    if (version === 'latest') {
      version = await getKiotaVersion(includePreRelease)
      core.debug(`Latest version is ${version}`)
    } else if (includePreRelease) {
      throw new Error(
        'The includePreRelease option can only be used with the latest version'
      )
    }

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Installing version ${version} ...`)
    await ensureKiotaIsPresent(version)
    const installPath = getKiotaPath(version)

    // Set outputs for other workflow steps to use
    core.setOutput('version', version)
    core.setOutput('path', installPath)
    core.exportVariable('KIOTA_TUTORIAL_ENABLED', 'false')
    core.addPath(getKiotaPath(version, false))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
