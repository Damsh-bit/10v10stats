import { execSync } from 'node:child_process'

/**
 * El commit que se está desplegando y su hora, para el footer. Se calcula al
 * compilar: en Vercel el hash viene en VERCEL_GIT_COMMIT_SHA y, como el build
 * no siempre trae la carpeta .git, la hora se le pide a GitHub (el repo es
 * público). En local sale de git. Si nada responde, queda la hora del build.
 */
async function commitActual() {
  const git = (comando) => {
    try {
      return execSync(`git ${comando}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return ''
    }
  }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse HEAD')
  let fecha = sha ? git(`log -1 --format=%cI ${sha}`) : ''
  if (sha && !fecha) {
    const repo = `${process.env.VERCEL_GIT_REPO_OWNER || 'Damsh-bit'}/${process.env.VERCEL_GIT_REPO_SLUG || '10v10stats'}`
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': '10v10stats-build' },
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) fecha = (await response.json())?.commit?.committer?.date ?? ''
    } catch {}
  }
  return { sha, fecha: fecha || new Date().toISOString() }
}

export default async function config() {
  const commit = await commitActual()

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
        },
      ],
    },
    env: {
      NEXT_PUBLIC_COMMIT_SHA: commit.sha,
      NEXT_PUBLIC_COMMIT_FECHA: commit.fecha,
    },
  }
  return nextConfig
}
