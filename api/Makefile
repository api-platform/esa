pages:
	showdown makehtml -i ../WHITEPAPER.md > white-paper.html
	cat templates/head.html white-paper.html templates/foot.html > public/white-paper.html
	rm white-paper.html
	showdown makehtml -i ../packages/ld/README.md > linked-data.html
	cat templates/head.html linked-data.html templates/foot.html > public/linked-data.html
	rm linked-data.html
	showdown makehtml -i ../packages/mercure/README.md > mercure.html
	cat templates/head.html mercure.html templates/foot.html > public/mercure.html
	rm mercure.html

build:
	docker compose --env-file .env.local build
	docker compose --env-file .env.local up -d  
	docker compose exec php bin/console app:load-fixtures
