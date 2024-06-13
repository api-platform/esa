white-paper:
	showdown makehtml -i ../WHITEPAPER.md > white-paper.html
	cat templates/white-paper-head.html white-paper.html templates/white-paper-foot.html > public/white-paper.html

build:
  docker compose --env-file .env.local build
  docker compose --env-file .env.local up -d	
	docker compose exec php bin/console app:load-fixtures
