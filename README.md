# GoBeyondFocus_Back
Backend projekta napravljenog u sklopu kolegija Web Aplikacije


# specifikacije backend-a

_# api endpoints_
GET
Provjera statusa servera
HTTP operacija: GET
odgovor: backend radi

POST/register
registracija novog korisnika
HTTP operacija: POST
  {"email": "string",
  "username": "string", 
  "password": "string"}
  odgovor: {
  "message": "Uspješno registriran",
  "korisnik": {
    "id": "ObjectId",
    "username": "string",
    "coins": 0
  }
}
greške: 400 "nedostaju podaci" / "korisnik postoji"

POST/login
prijava već postojećeg korisnika
HTTP operacija: POST
{
  "username": "string",
  "password": "string"
}
odgovor: {
  "message": "Uspješna prijava",
  "korisnik": {
    "id": "ObjectId",
    "username": "string",
    "coins": "number",
    "selectedCharacter": "string",
    "ownedOutfits": ["string"]
  }
}
greška: 400 "korisnik ne postoji" / "lozinka nije dobra"


POST /start-focus
pokretanje focus sesije
HTTP operacija: POST

json
{ "minutes": "number"}

odgovor:json
{
  "message": "Focus started successfully",
  "startTime": "Date",
  "duration": "number"
}
greška: 401 "Unauthorized" / "Invalid duration" / "User not found"


POST /end-focus
završavanje focus sesije i dodjeljivanje kovanica
HTTP operacija: POST

odgovor:
json
{
  "message": "Focus session completed",
  "timeSpent": "number",
  "coinsEarned": "number", 
  "totalCoins": "number"
}
greška:  / 400 "No active focus session" /  "User not found"

GET /focus-status
provjera trenutnog statusa focus sesije
HTTP operacija: GET

Odgovor (aktivna sesija)

json
{
  "inFocus": true,
  "remainingMinutes": "number",
  "elapsedMinutes": "number",
  "totalDuration": "number"
}
Odgovor (neaktivna sesija)

json
{
  "inFocus": false,
  "message": "No active focus session"
}
Greške: 401 "Unauthorized" / "User not found"

POST /update-character
ažuriranje odabranog lika
HTTP operacija: POST

json
{
  "selectedCharacter": "string"
}
odgovor: json {
  "message": "Lik ažuriran"
}
greška: 401 "Nije autorizirano"

POST /buy-outfit
kupovina odijeće za lika
HTTP operacija: POST
json
{
  "outfitName": "string",
  "price": "number"
}
odgovor:
json
{
  "message": "Outfit kupljen",
  "coins": "number"
}
greška: 400 "Nije autorizirano" / "Nedovoljno kovanica"

