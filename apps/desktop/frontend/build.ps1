param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$TrunkArgs
)

$ErrorActionPreference = "Stop"

# Trunk 0.21 misreads NO_COLOR=1 as the invalid argument `--no-color 1`.
$previousNoColor = [Environment]::GetEnvironmentVariable("NO_COLOR", "Process")
$exitCode = 1

try {
    [Environment]::SetEnvironmentVariable("NO_COLOR", $null, "Process")
    & trunk build @TrunkArgs
    $exitCode = $LASTEXITCODE
}
finally {
    [Environment]::SetEnvironmentVariable("NO_COLOR", $previousNoColor, "Process")
}

exit $exitCode
