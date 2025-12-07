param(
    [string]$OutputDir = "d:/VPS/htdocs/assets/audio"
)

function New-SineWave {
    param(
        [string]$Path,
        [double]$Frequency = 320,
        [double]$DurationSeconds = 5,
        [int]$SampleRate = 22050,
        [int]$Volume = 16000
    )
    $sampleCount = [int]($SampleRate * $DurationSeconds)
    $memory = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($memory)

    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
    $writer.Write([int]0)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
    $writer.Write([int]16)
    $writer.Write([int16]1)
    $writer.Write([int16]1)
    $writer.Write([int]$SampleRate)
    $writer.Write([int]($SampleRate * 2))
    $writer.Write([int16]2)
    $writer.Write([int16]16)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
    $writer.Write([int]0)

    for ($n = 0; $n -lt $sampleCount; $n++) {
        $value = [int]($Volume * [math]::Sin((2 * [math]::PI * $Frequency * $n) / $SampleRate))
        $writer.Write([int16]$value)
    }

    $writer.Seek(4, 'Begin') | Out-Null
    $writer.Write([int]($memory.Length - 8))
    $writer.Seek(40, 'Begin') | Out-Null
    $writer.Write([int]($sampleCount * 2))
    $writer.Flush()

    [System.IO.File]::WriteAllBytes($Path, $memory.ToArray())
    $writer.Dispose()
    $memory.Dispose()
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$frequencies = @(260, 300, 340, 380, 420, 460, 500)
$names = @(
    "nguyen_duc_ung_intro",
    "27_nghiabinh",
    "nha_tuong_niem",
    "van_te",
    "dao_truong",
    "la_co",
    "phong_van_1958"
)

for ($i = 0; $i -lt $names.Count; $i++) {
    $filename = Join-Path $OutputDir ($names[$i] + ".wav")
    New-SineWave -Path $filename -Frequency $frequencies[$i]
}

Write-Output "Đã tạo file WAV mô phỏng tại $OutputDir"
