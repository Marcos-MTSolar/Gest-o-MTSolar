
$path = "src/pages/ProposalGenerator.tsx"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$replacements = @{
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã­" = "í"
    "Ã³" = "ó"
    "Ãº" = "ú"
    "Ã£" = "ã"
    "Ãµ" = "õ"
    "Ã¢" = "â"
    "Ãª" = "ê"
    "Ã®" = "î"
    "Ã´" = "ô"
    "Ã»" = "û"
    "Ã§" = "ç"
    "â€”" = "—"
    "Â°" = "°"
    "PÃ¡gina" = "Página"
    "NÂº" = "Nº"
    "â˜€ï¸" = "☀️"
    "ðŸ”²" = "🔲"
    "âš⚡" = "⚡"
    "ðŸ”©" = "🔨"
    "ðŸ”Œ" = "🔌"
    "âœ“" = "✓"
    "â†" = "←"
    "â†’" = "→"
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
