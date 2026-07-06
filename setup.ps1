Write-Host "=== Auto Short SaaS Setup ===" -ForegroundColor Cyan

# Copy .env.example to .env if not exists
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "Created backend\.env from .env.example" -ForegroundColor Green
    Write-Host "  -> Edit backend\.env and set your OPENAI_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "backend\.env already exists" -ForegroundColor Green
}

# Install root dependencies
Write-Host "`nInstalling root dependencies..." -ForegroundColor Cyan
npm install

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Cyan
npm install --prefix backend

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Cyan
npm install --prefix frontend/frontend

Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local development:" -ForegroundColor White
Write-Host "  npm run dev          # backend:4000 + frontend:3000"
Write-Host ""
Write-Host "Docker production:" -ForegroundColor White
Write-Host "  docker compose up -d"
Write-Host ""
Write-Host "Docker development:" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.dev.yml up -d"