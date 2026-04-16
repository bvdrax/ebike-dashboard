param([Parameter(Mandatory=$true)][string]$Code)

$SshTarget = "bvdrax@10.0.0.31"
$RemoteDir = "/home/bvdrax/apps/ebike"

Write-Host "[1/4] Reading credentials from server..."
$clientId     = (ssh $SshTarget "grep ^STRAVA_CLIENT_ID= $RemoteDir/.env")     -replace "STRAVA_CLIENT_ID=",""
$clientSecret = (ssh $SshTarget "grep ^STRAVA_CLIENT_SECRET= $RemoteDir/.env") -replace "STRAVA_CLIENT_SECRET=",""

Write-Host "[2/4] Exchanging code for token..."
$response = Invoke-RestMethod -Method Post -Uri "https://www.strava.com/oauth/token" -Body @{
    client_id     = $clientId.Trim()
    client_secret = $clientSecret.Trim()
    code          = $Code.Trim()
    grant_type    = "authorization_code"
}

$refreshToken = $response.refresh_token
Write-Host "      Athlete: $($response.athlete.firstname) $($response.athlete.lastname) (id: $($response.athlete.id))"
Write-Host "      Token:   $($refreshToken.Substring(0,8))..."

Write-Host "[3/4] Updating .env on server..."
ssh $SshTarget "sed -i 's|^STRAVA_REFRESH_TOKEN=.*|STRAVA_REFRESH_TOKEN=$refreshToken|' $RemoteDir/.env"

Write-Host "[4/4] Restarting backend..."
ssh $SshTarget "cd $RemoteDir && docker compose up -d"

Write-Host ""
Write-Host "Done. Tail logs with:"
Write-Host "  ssh $SshTarget 'cd $RemoteDir && docker compose logs backend -f'"
