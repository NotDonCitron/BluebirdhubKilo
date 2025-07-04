# AbacusHub Windows Access Setup Script
# Run this as Administrator in PowerShell

Write-Host "🚀 Setting up AbacusHub access for Windows..." -ForegroundColor Green

# Get WSL IP (you may need to update this if WSL IP changes)
$wslIP = "172.20.67.92"
$port = 3000

Write-Host "📡 Setting up port forwarding from Windows localhost:$port to WSL $wslIP`:$port" -ForegroundColor Yellow

try {
    # Remove existing port forwarding if it exists
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=127.0.0.1 2>$null
    
    # Add new port forwarding
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=127.0.0.1 connectport=$port connectaddress=$wslIP
    
    Write-Host "✅ Port forwarding configured successfully!" -ForegroundColor Green
    
    # Show current port forwarding rules
    Write-Host "`n📋 Current port forwarding rules:" -ForegroundColor Cyan
    netsh interface portproxy show all
    
    # Test connectivity
    Write-Host "`n🧪 Testing connectivity..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ SUCCESS! AbacusHub is accessible at http://localhost:$port" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Direct localhost test failed, but forwarding is set up. Try: http://localhost:$port" -ForegroundColor Yellow
    }
    
    Write-Host "`n🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   • Home: http://localhost:$port" -ForegroundColor White
    Write-Host "   • Login: http://localhost:$port/login" -ForegroundColor White
    Write-Host "   • Alternative: http://$wslIP`:$port" -ForegroundColor Gray
    
    Write-Host "`n🔑 Login Credentials:" -ForegroundColor Cyan
    Write-Host "   • Email: test@example.com" -ForegroundColor White
    Write-Host "   • Password: password123" -ForegroundColor White
    
    Write-Host "`n💡 Note: Browser extension errors are normal and don't affect functionality." -ForegroundColor Gray
    
}
catch {
    Write-Host "❌ Error setting up port forwarding: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running PowerShell as Administrator, or use direct IP: http://$wslIP`:$port" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup complete! Open your browser and navigate to http://localhost:$port" -ForegroundColor Green