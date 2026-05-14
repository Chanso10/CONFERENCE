# BCONF Install Directions:

## Prerequisites:
Node.js & Npm: apt install nodejs npm
Git: apt install git
Postgresql: apt install postgresql 16.13
Optional - VSCode: (https://code.visualstudio.com/download, get the .deb file for Linux. Command to install: apt install ./<file.deb>


## Install Directions:
1. In desired repository, run: 
```
git clone -b main https://github.com/Chanso10/CONFERENCE.git
```
2. In PostgreSQL, create a datatable with default name “bconf”
	```
	psql -h localhost -U postgres
	CREATE DATABASE bconf;
	```
3. In PostgreSQL, create user “bconf” with password “g0valp0”. 
	```
	CREATE USER bconf WITH PASSWORD 'g0valp0';
	```
(Optional) If different user and password are desired, change said items within the .env file in:
	CONFERENCE/BCONF/server/.env
4. Grant user “bconf” permissions. Run the following PostgreSQL script:
```
GRANT ALL PRIVILEGES ON DATABASE bconf TO bconf;
GRANT CONNECT ON DATABASE bconf TO bconf;
GRANT ALL PRIVILEGES ON SCHEMA public TO bconf;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bconf;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bconf;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bconf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO bconf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO bconf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON FUNCTIONS TO bconf;
ALTER DATABASE bconf OWNER TO bconf;
ALTER SCHEMA public OWNER TO bconf;
```
6. Sign into user “bconf” as host “localhost”: 
	```
	psql -h localhost -U bconf
	```
7. Connect to database “bconf”
	\c bconf
8. Copy and paste the all PostgreSQL script found in: 
	/CONFERENCE/BCONF/server/database.sql
These commands can be pasted all together and ran all at once
9. Run the following commands to install dependencies (this can be done within VSCode command line. Open VSCode using “code .”):
	```
	CONFERENCE\BCONF\server> npm install
	```
and
	```
	CONFERENCE\BCONF\client> npm install
	```
10. Everything is now set up. To launch the app, run 
	```
	CONFERENCE\BCONF\server> node index
	```
and
	```
	CONFERENCE\BCONF\client> npm start
	```
11. If there are SSH X11 issues, run:
	```
	export XAUTHORITY=$HOME/.Xauthority
	```
1.. If there are file dialog issues within Firefox, type 
	about:config 
in the address bar, search for 
	widget.use-xdg-desktop-portal.file-picker
and set it to 0
