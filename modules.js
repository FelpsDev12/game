export const Debounce = {

	processActives: [],

	counter: 0,
	time: 0,
	initialId: 0,

	Add(identifier, initialTime) {

		let type = initialTime < 1000 ? "mil" : "seconds"
		let timing;

		this.counter += 1
		let currentTime = initialTime

		this.initialId += 1
		let id = this.initialId

		this.processActives.push({ identifier: `${identifier}`, duration: initialTime, process: id += 1 })

		if (type == "seconds") {
			timing = setInterval(() => {
				if (currentTime > 0) {
					currentTime -= 1000

					console.log(`Tempo restante: ${currentTime}`)
				}
			}, 1000)
		} else {
			timing = setInterval(() => {
				if (currentTime > 0) {
					currentTime -= 100

					console.log(`Tempo restante: ${currentTime}`)
				}
			}, 100)
		}

		const remove = setInterval(() => {
			if (currentTime <= 0) {
				const findIdentifier = this.processActives.findIndex(p => p.identifier == identifier)

				if (!findIdentifier !== -1) {
					this.processActives.splice(findIdentifier.id + 1, 1);

					[remove, timing].forEach(clearInterval)
				}
			}
		}, 100)
	},

	Check(identifier) {
		const findProcess = this.processActives.find(v => v.identifier === identifier)

		if (!findProcess) return false;

		return true
	}
}

window.addEventListener("keydown", (e) => {
	if (e.key === "p") {
		if (!Debounce.Check("Comer")) {
			console.log("Expirou")
			return;
		}

		console.log("Ta ativo ainda fio")
	}
})