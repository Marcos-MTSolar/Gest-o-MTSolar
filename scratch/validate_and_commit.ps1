npm run build
if ($LASTEXITCODE -eq 0) {
    git add .
    git commit -m "feat: expand VENDEDOR role permissions to Dashboard, WhatsApp, Agenda, and Proposal Generator"
    git push origin main
}
