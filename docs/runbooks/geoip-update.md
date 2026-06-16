# GeoIP Update Runbook

IP region data is mounted into the backend container at `/app/data/geoip`.

Expected files:

- `ip2region.xdb`
- `GeoLite2-City.mmdb`

Update cadence is operational. Replace the files, restart the backend container, and record the update in `docs/iteration-log.md`.

