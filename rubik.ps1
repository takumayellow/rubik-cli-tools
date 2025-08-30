param(
  [ValidateSet("init","random","solve","facelets")]
  [string]$cmd = "random",
  [int]$len = 25,
  [Nullable[int]]$seed = $null,
  [string]$scramble,
  [string]$state
)
$root = $PSScriptRoot; if (-not $root) { $root = (Get-Location).Path }
$py = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
  python -m venv (Join-Path $root ".venv") | Out-Null
  $py = Join-Path $root ".venv\Scripts\python.exe"
}

switch ($cmd) {
  "init" {
    & $py -m pip install --upgrade pip
    & $py -m pip install kociemba pycuber
    break
  }
  "random" {
    $args = @(".\random_scramble_and_solve.py","--len",$len)
    if ($seed -ne $null) { $args += @("--seed",$seed) }
    & $py @args
    break
  }
  "solve" {
    if (-not $scramble) { Write-Error "Use: .\rubik.ps1 solve -scramble \"R U R' U' ...\""; exit 1 }
    & $py ".\solve_with_kociemba_from_scramble.py" --scramble $scramble
    break
  }
  "facelets" {
    if (-not $state) { Write-Error "Use: .\rubik.ps1 facelets -state <54 chars> (URFDLB)"; exit 1 }
    & $py ".\solve_facelets.py" --state $state
    break
  }
}
