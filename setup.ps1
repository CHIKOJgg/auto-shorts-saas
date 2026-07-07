Write-Host "=== Auto Short SaaS Setup ===" -ForegroundColor Cyan

# Copy .env.example to .env if not exists
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "Created backend\.env from .env.example" -ForegroundColor Green
    Write-Host "  -> Edit backend\.env and set your OPENAI_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "backend\.env already exists" -ForegroundColor Green
}

Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker development (hot reload):" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.dev.yml up -d" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Docker production:" -ForegroundColor White
Write-Host "  docker compose up -d" -ForegroundColor Green
Write-Host "  App: http://localhost:80" -ForegroundColor Green
Write-Host ""
Write-Host "First time setup:" -ForegroundColor Yellow
Write-Host "  1. Edit backend\.env and set your OPENAI_API_KEY" -ForegroundColor Yellow
Write-Host "  2. Run one of the docker compose commands above" -ForegroundColor Yellow
Write-Host "  3. Test: curl http://localhost:4000/api/health" -ForegroundColor Yellow
