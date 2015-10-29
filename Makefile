VERSION=0.0.2

all: qsa sizzle nwmatcher sly peppy
	@echo "DONE"

qsa:
	@cp jtype.js jtype-$(VERSION).js
	@echo "Wrote jtype-$(VERSION).js (QuerySelectorAll)"

sizzle:
	@cat jtype.js > jtype-$@-$(VERSION).js
	@cat seleng/sizzle/src/sizzle.js >> jtype-$@-$(VERSION).js
	@echo "JType.SelEng = Sizzle" >> jtype-$@-$(VERSION).js
	@echo "JType.MatchEng = Sizzle.matchesSelector" >> jtype-$@-$(VERSION).js
	@echo "Wrote jtype-$@-$(VERSION).js"

nwmatcher:
	@cat jtype.js > jtype-$@-$(VERSION).js
	@cat seleng/nwmatcher/src/nwmatcher.js >> jtype-$@-$(VERSION).js
	@echo "JType.SelEng = NW.Dom.select" >> jtype-$@-$(VERSION).js
	@echo "Wrote jtype-$@-$(VERSION).js"

sly:
	@cat jtype.js > jtype-$@-$(VERSION).js
	@cat seleng/sly/Sly.js >> jtype-$@-$(VERSION).js
	@echo "JType.SelEng = Sly.search" >> jtype-$@-$(VERSION).js
	@echo "Wrote jtype-$@-$(VERSION).js"

peppy:
	@cat jtype.js > jtype-$@-$(VERSION).js
	@cat seleng/peppy/peppy.js >> jtype-$@-$(VERSION).js
	@echo "JType.SelEng = Peppy.query" >> jtype-$@-$(VERSION).js
	@echo "Wrote jtype-$@-$(VERSION).js"
