document.addEventListener('DOMContentLoaded', function () {
	// Блок 1: загальна ініціалізація сторінки
	setMinBookingDate();
	initWeatherSection();
	initBookingForm();
	initAvailabilityCalendar();
	initMediaModalAndGallery();
	initSimpleGallerySlider();
	initMobileMenu();

	// Блок 2: обмеження мінімальної дати для поля виїзду
	function setMinBookingDate() {
		var dateField = qs('.booking__input--date');
		if (!dateField) {
			return;
		}

		var today = new Date();
		dateField.min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
	}

	// Блок 3: завантаження поточної погоди по напрямках
	function initWeatherSection() {
		var weatherSection = qs('.weather');
		if (!weatherSection) {
			return;
		}

		var weatherCodeMap = {
			0: 'Ясно',
			1: 'Переважно ясно',
			2: 'Мінлива хмарність',
			3: 'Хмарно',
			45: 'Туман',
			48: 'Туман',
			51: 'Легка мряка',
			53: 'Мряка',
			55: 'Сильна мряка',
			61: 'Легкий дощ',
			63: 'Дощ',
			65: 'Сильний дощ',
			80: 'Короткочасний дощ',
			81: 'Дощові зливи',
			82: 'Сильні зливи',
			95: 'Гроза'
		};

		var searchForm = qs('.weather__search-form', weatherSection);
		var cityInput = qs('.weather__input', weatherSection);
		var locationButton = qs('.weather__location-btn', weatherSection);
		var statusNode = qs('.weather__status', weatherSection);
		var resultCard = qs('.weather__result', weatherSection);
		var resultCityNode = qs('.weather__result-city', weatherSection);
		var resultIconNode = qs('.weather__result-icon', weatherSection);
		var resultTempNode = qs('.weather__result-temp', weatherSection);
		var resultStateNode = qs('.weather__result-state', weatherSection);
		var resultWindNode = qs('.weather__result-wind', weatherSection);

		function getWeatherIcon(weatherCode) {
			if (weatherCode === 0) {
				return '☀️';
			}
			if (weatherCode === 1 || weatherCode === 2) {
				return '🌤️';
			}
			if (weatherCode === 3) {
				return '☁️';
			}
			if (weatherCode === 45 || weatherCode === 48) {
				return '🌫️';
			}
			if (weatherCode >= 51 && weatherCode <= 67) {
				return '🌧️';
			}
			if (weatherCode >= 71 && weatherCode <= 77) {
				return '❄️';
			}
			if (weatherCode >= 80 && weatherCode <= 82) {
				return '🌦️';
			}
			if (weatherCode >= 95) {
				return '⛈️';
			}
			return '⛅';
		}

		function setStatus(message, isError) {
			if (!statusNode) {
				return;
			}
			statusNode.textContent = message || '';
			statusNode.classList.toggle('is-error', !!isError);
		}

		function buildWeatherUrl(lat, lon) {
			return 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto';
		}

		function fetchWeather(lat, lon) {
			return fetch(buildWeatherUrl(lat, lon))
				.then(function (response) {
					if (!response.ok) {
						throw new Error('Помилка запиту до погодного API');
					}
					return response.json();
				})
				.then(function (data) {
					if (!data || !data.current) {
						throw new Error('Некоректна відповідь від погодного API');
					}
					return data.current;
				});
		}

		function renderWeatherCard(tempNode, stateNode, windNode, weatherCurrent) {
			tempNode.textContent = Math.round(weatherCurrent.temperature_2m) + '°C';
			stateNode.textContent = weatherCodeMap[weatherCurrent.weather_code] || 'Погодні дані оновлено';
			windNode.textContent = 'Вітер: ' + Math.round(weatherCurrent.wind_speed_10m) + ' км/год';
		}

		function renderResultCard(title, weatherCurrent) {
			if (!resultCard || !resultCityNode || !resultIconNode || !resultTempNode || !resultStateNode || !resultWindNode) {
				return;
			}

			resultCityNode.textContent = title;
			resultIconNode.textContent = getWeatherIcon(weatherCurrent.weather_code);
			resultTempNode.textContent = Math.round(weatherCurrent.temperature_2m) + '°C';
			resultStateNode.textContent = 'Стан: ' + (weatherCodeMap[weatherCurrent.weather_code] || 'Погодні дані оновлено');
			resultWindNode.textContent = 'Вітер: ' + Math.round(weatherCurrent.wind_speed_10m) + ' км/год';
			resultCard.hidden = false;
		}

		function fetchCityCoordinates(cityName) {
			var geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(cityName) + '&count=1&language=uk&format=json';

			return fetch(geocodingUrl)
				.then(function (response) {
					if (!response.ok) {
						throw new Error('Помилка геокодування міста');
					}
					return response.json();
				})
				.then(function (data) {
					if (!data || !Array.isArray(data.results) || !data.results.length) {
						throw new Error('Місто не знайдено. Спробуйте іншу назву.');
					}

					return data.results[0];
				});
		}

		qsa('.weather__card', weatherSection).forEach(function (card) {
			var lat = card.dataset.lat;
			var lon = card.dataset.lon;
			var tempNode = qs('.weather__card-temp', card);
			var stateNode = qs('.weather__card-state', card);
			var windNode = qs('.weather__card-wind', card);
			if (!lat || !lon || !tempNode || !stateNode || !windNode) {
				return;
			}

			fetchWeather(lat, lon)
				.then(function (current) {
					renderWeatherCard(tempNode, stateNode, windNode, current);
				})
				.catch(function () {
					tempNode.textContent = '--°C';
					stateNode.textContent = 'Немає даних';
					windNode.textContent = 'Вітер: -- км/год';
				});
		});

		if (searchForm && cityInput) {
			searchForm.addEventListener('submit', function (event) {
				event.preventDefault();
				var cityName = cityInput.value.trim();
				if (!cityName) {
					setStatus('Введіть назву міста.', true);
					cityInput.focus();
					return;
				}

				setStatus('Шукаю місто та завантажую погоду...', false);

				fetchCityCoordinates(cityName)
					.then(function (city) {
						return fetchWeather(city.latitude, city.longitude)
							.then(function (current) {
								var cityTitle = city.name + (city.country ? ', ' + city.country : '');
								renderResultCard(cityTitle, current);
								setStatus('Дані успішно оновлено.', false);
							});
					})
					.catch(function (error) {
						setStatus(error && error.message ? error.message : 'Не вдалося завантажити погоду. Спробуйте пізніше.', true);
					});
			});
		}

		if (locationButton) {
			locationButton.addEventListener('click', function () {
				if (!navigator.geolocation) {
					setStatus('Ваш браузер не підтримує геолокацію.', true);
					return;
				}

				setStatus('Визначаю вашу локацію...', false);
				navigator.geolocation.getCurrentPosition(function (position) {
					fetchWeather(position.coords.latitude, position.coords.longitude)
						.then(function (current) {
							renderResultCard('Ваша локація', current);
							setStatus('Погоду для вашої локації оновлено.', false);
						})
						.catch(function () {
							setStatus('Не вдалося отримати погоду для вашої локації.', true);
						});
				}, function () {
					setStatus('Доступ до геолокації відхилено або недоступний.', true);
				}, { timeout: 10000 });
			});
		}
	}

	// Блок 4: логіка форми бронювання (масив заявок, валідація, формат телефону)
	function initBookingForm() {
		var bookingForm = qs('.booking__form');
		if (!bookingForm) {
			return;
		}

		var nameInput = qs('input[name="fullName"]', bookingForm);
		var countryCodeSelect = qs('select[name="countryCode"]', bookingForm);
		var phoneInput = qs('input[name="phone"]', bookingForm);
		var emailInput = qs('input[name="email"]', bookingForm);
		var departureInput = qs('input[name="departureDate"]', bookingForm);
		var commentInput = qs('textarea[name="comment"]', bookingForm);
		var agreementInput = qs('input[name="agreement"]', bookingForm);
		var formMessage = qs('.booking__form-message', bookingForm);

		var bookingRequests = Array.isArray(window.bookingRequests) ? window.bookingRequests : [];
		var phoneConfigs = {
			'+380': { localLength: 9, groups: [2, 3, 2, 2], example: '50 123 45 67' },
			'+48': { localLength: 9, groups: [3, 3, 3], example: '512 345 678' },
			'+49': { localLength: 10, groups: [3, 3, 4], example: '151 234 5678' },
			'+44': { localLength: 10, groups: [4, 3, 3], example: '7911 123 456' },
			'+1': { localLength: 10, groups: [3, 3, 4], example: '555 123 4567' }
		};

		function getActivePhoneConfig() {
			var dialCode = countryCodeSelect ? countryCodeSelect.value : '+380';
			var base = phoneConfigs[dialCode] || phoneConfigs['+380'];
			return { dialCode: phoneConfigs[dialCode] ? dialCode : '+380', localLength: base.localLength, groups: base.groups, example: base.example };
		}

		function normalizePhoneDigits(value, config) {
			var activeConfig = config || getActivePhoneConfig();
			var digits = (value || '').replace(/\D/g, '');
			var dialCodeDigits = activeConfig.dialCode.replace('+', '');

			if (digits.indexOf(dialCodeDigits) === 0) {
				digits = digits.slice(dialCodeDigits.length);
			}
			if (digits.indexOf('8') === 0 && digits.length === activeConfig.localLength + 1) {
				digits = digits.slice(1);
			}
			if (activeConfig.localLength === 10 && digits.length === 9) {
				digits = '0' + digits;
			}
			if (digits.length > activeConfig.localLength) {
				digits = digits.slice(0, activeConfig.localLength);
			}
			return digits;
		}

		function splitDigitsByGroups(digits, groups) {
			var parts = [];
			for (var i = 0, offset = 0; i < groups.length && offset < digits.length; i++) {
				var part = digits.slice(offset, offset + groups[i]);
				if (part) {
					parts.push(part);
				}
				offset += groups[i];
			}
			if (parts.join('').length < digits.length) {
				parts.push(digits.slice(parts.join('').length));
			}
			return parts;
		}

		function formatPhoneByConfig(value, config) {
			var activeConfig = config || getActivePhoneConfig();
			var digits = normalizePhoneDigits(value, activeConfig);
			return digits.length ? activeConfig.dialCode + ' ' + splitDigitsByGroups(digits, activeConfig.groups).join(' ') : '';
		}

		function isValidPhone(value, config) {
			return normalizePhoneDigits(value, config || getActivePhoneConfig()).length === (config || getActivePhoneConfig()).localLength;
		}

		function setFormMessage(text, isError) {
			if (!formMessage) {
				return;
			}
			formMessage.textContent = text;
			formMessage.classList.remove('is-error', 'is-success');
			formMessage.classList.add(isError ? 'is-error' : 'is-success');
		}

		if (countryCodeSelect && phoneInput) {
			phoneInput.placeholder = getActivePhoneConfig().example;
			countryCodeSelect.addEventListener('change', function () {
				var config = getActivePhoneConfig();
				phoneInput.placeholder = config.example;
				phoneInput.value = formatPhoneByConfig(phoneInput.value, config);
			});
		}

		if (phoneInput) {
			phoneInput.addEventListener('input', function () {
				phoneInput.value = formatPhoneByConfig(phoneInput.value, getActivePhoneConfig());
			});
			phoneInput.addEventListener('blur', function () {
				if (!normalizePhoneDigits(phoneInput.value, getActivePhoneConfig())) {
					phoneInput.value = '';
				}
			});
		}

		bookingForm.addEventListener('submit', function (event) {
			event.preventDefault();
			if (!nameInput || !phoneInput || !emailInput || !departureInput || !agreementInput) {
				return;
			}

			if (!nameInput.value.trim()) {
				setFormMessage('Вкажіть, будь ласка, ваше ім\'я.', true);
				nameInput.focus();
				return;
			}

			var phoneConfig = getActivePhoneConfig();
			if (!isValidPhone(phoneInput.value, phoneConfig)) {
				setFormMessage('Телефон має бути у форматі: ' + phoneConfig.dialCode + ' ' + phoneConfig.example + '.', true);
				phoneInput.focus();
				return;
			}

			if (!emailInput.value.trim() || !emailInput.checkValidity()) {
				setFormMessage('Введіть коректний e-mail.', true);
				emailInput.focus();
				return;
			}

			if (!departureInput.value) {
				setFormMessage('Оберіть дату виїзду.', true);
				departureInput.focus();
				return;
			}

			if (!agreementInput.checked) {
				setFormMessage('Підтвердіть згоду на обробку персональних даних.', true);
				agreementInput.focus();
				return;
			}

			bookingRequests.push({
				fullName: nameInput.value.trim(),
				countryCode: phoneConfig.dialCode,
				phone: formatPhoneByConfig(phoneInput.value, phoneConfig),
				email: emailInput.value.trim(),
				departureDate: departureInput.value,
				comment: commentInput ? commentInput.value.trim() : '',
				agreement: agreementInput.checked,
				createdAt: new Date().toISOString()
			});

			window.bookingRequests = bookingRequests;
			setFormMessage('Заявку збережено. Дякуємо! Звернень у масиві: ' + bookingRequests.length + '.', false);
			bookingForm.reset();
			if (countryCodeSelect && phoneInput) {
				phoneInput.placeholder = getActivePhoneConfig().example;
			}
		});
	}

	// Блок 5: календар доступності та швидкий вибір дат
	function initAvailabilityCalendar() {
		var availabilityRoot = qs('.availability');
		var availabilityData = window.availabilityData;
		if (!availabilityRoot || !availabilityData) {
			return;
		}

		var monthLabelNode = qs('.availability__month', availabilityRoot);
		var daysNode = qs('.availability__days', availabilityRoot);
		var cardsNode = qs('.availability__cards', availabilityRoot);
		var bookingSection = qs('#booking');
		var dateField = qs('.booking__input--date');

		if (monthLabelNode) {
			monthLabelNode.textContent = availabilityData.monthLabel;
		}

		var daysMap = {};
		availabilityData.days.forEach(function (item) {
			daysMap[item.day] = item.status;
		});

		function selectDate(isoDate) {
			if (dateField) {
				dateField.value = isoDate;
			}

			var activeDay = qs('.availability__day.is-selected', availabilityRoot);
			if (activeDay) {
				activeDay.classList.remove('is-selected');
			}

			var selectedDay = qs('.availability__day[data-date="' + isoDate + '"]', availabilityRoot);
			if (selectedDay) {
				selectedDay.classList.add('is-selected');
			}

			if (bookingSection) {
				bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}

		if (daysNode) {
			daysNode.innerHTML = '';
			var firstDay = new Date(availabilityData.year, availabilityData.month - 1, 1);
			var daysInMonth = new Date(availabilityData.year, availabilityData.month, 0).getDate();
			var weekOffset = (firstDay.getDay() + 6) % 7;

			for (var i = 0; i < weekOffset; i++) {
				daysNode.appendChild(createEl('span', { className: 'availability__day is-empty' }));
			}

			for (var currentDay = 1; currentDay <= daysInMonth; currentDay++) {
				var status = daysMap[currentDay] || 'free';
				var dateIso = availabilityData.year + '-' + String(availabilityData.month).padStart(2, '0') + '-' + String(currentDay).padStart(2, '0');
				var dayButton = createEl('button', {
					type: 'button',
					className: 'availability__day availability__day--' + status,
					textContent: currentDay
				});

				dayButton.dataset.date = dateIso;
				if (status === 'busy') {
					dayButton.disabled = true;
				}
				dayButton.addEventListener('click', function (event) {
					selectDate(event.currentTarget.dataset.date);
				});
				daysNode.appendChild(dayButton);
			}
		}

		if (cardsNode) {
			cardsNode.innerHTML = '';
			availabilityData.departures.forEach(function (tour) {
				var card = createEl('div', { className: 'availability__card' });
				var dateText = createEl('p', { className: 'availability__card-date', textContent: tour.label });
				var titleText = createEl('p', { className: 'availability__card-text', textContent: tour.title });
				var statusText = createEl('p', { className: 'availability__card-status availability__card-status--' + tour.status, textContent: tour.statusText });
				var pickButton = createEl('button', { type: 'button', className: 'availability__card-btn', textContent: 'Обрати дату' });

				pickButton.dataset.date = tour.date;
				pickButton.addEventListener('click', function (event) {
					selectDate(event.currentTarget.dataset.date);
				});

				card.appendChild(dateText);
				card.appendChild(titleText);
				card.appendChild(statusText);
				card.appendChild(pickButton);
				cardsNode.appendChild(card);
			});
		}
	}

	// Блок 6: модальне вікно для відео та галереї
	function initMediaModalAndGallery() {
		var modal = createMediaModal();

		qsa('.popup_link').forEach(function (link) {
			link.addEventListener('click', function (event) {
				event.preventDefault();
				modal.openIframe(link.href);
			});
		});

		var galleryLinks = qsa('.gallery__item-link');
		var galleryImages = galleryLinks.map(function (link) {
			return link.getAttribute('href');
		});

		galleryLinks.forEach(function (link, index) {
			link.addEventListener('click', function (event) {
				event.preventDefault();
				modal.openGallery(galleryImages, index);
			});
		});
	}

	// Блок 7: створення та керування вмістом модального вікна
	function createMediaModal() {
		var overlay = createEl('div', { className: 'media-modal' });
		var content = createEl('div', { className: 'media-modal__content' });
		var closeButton = createEl('button', { type: 'button', className: 'media-modal__close', textContent: '×' });
		var prevButton = createEl('button', { type: 'button', className: 'media-modal__nav media-modal__nav--prev', textContent: '‹' });
		var nextButton = createEl('button', { type: 'button', className: 'media-modal__nav media-modal__nav--next', textContent: '›' });
		var image = createEl('img', { className: 'media-modal__image' });
		var iframe = createEl('iframe', { className: 'media-modal__iframe' });

		closeButton.setAttribute('aria-label', 'Закрити');
		prevButton.setAttribute('aria-label', 'Попереднє фото');
		nextButton.setAttribute('aria-label', 'Наступне фото');
		image.alt = '';
		iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
		iframe.allowFullscreen = true;

		content.appendChild(closeButton);
		content.appendChild(prevButton);
		content.appendChild(nextButton);
		content.appendChild(image);
		content.appendChild(iframe);
		overlay.appendChild(content);
		document.body.appendChild(overlay);

		var galleryItems = [];
		var currentIndex = 0;
		var mode = null;

		function showImage(index) {
			currentIndex = index;
			image.src = galleryItems[currentIndex] || '';
			image.style.display = 'block';
			iframe.style.display = 'none';
			iframe.src = '';
			var visible = galleryItems.length > 1 ? 'flex' : 'none';
			prevButton.style.display = visible;
			nextButton.style.display = visible;
		}

		function close() {
			overlay.classList.remove('is-open');
			iframe.src = '';
		}

		function openIframe(src) {
			mode = 'iframe';
			image.style.display = 'none';
			iframe.style.display = 'block';
			iframe.src = src;
			prevButton.style.display = 'none';
			nextButton.style.display = 'none';
			overlay.classList.add('is-open');
		}

		function openGallery(items, startIndex) {
			mode = 'gallery';
			galleryItems = items.slice();
			showImage(startIndex || 0);
			overlay.classList.add('is-open');
		}

		closeButton.addEventListener('click', close);
		overlay.addEventListener('click', function (event) {
			if (event.target === overlay) {
				close();
			}
		});
		prevButton.addEventListener('click', function () {
			if (galleryItems.length) {
				showImage((currentIndex - 1 + galleryItems.length) % galleryItems.length);
			}
		});
		nextButton.addEventListener('click', function () {
			if (galleryItems.length) {
				showImage((currentIndex + 1) % galleryItems.length);
			}
		});

		document.addEventListener('keydown', function (event) {
			if (!overlay.classList.contains('is-open')) {
				return;
			}
			if (event.key === 'Escape') {
				close();
			}
			if (mode === 'gallery' && event.key === 'ArrowLeft') {
				prevButton.click();
			}
			if (mode === 'gallery' && event.key === 'ArrowRight') {
				nextButton.click();
			}
		});

		return { openIframe: openIframe, openGallery: openGallery };
	}

	// Блок 8: простий слайдер галереї з кнопками вперед/назад
	function initSimpleGallerySlider() {
		var gallerySlider = qs('.gallery__slider');
		if (!gallerySlider) {
			return;
		}

		var slides = qsa('.galeri__item', gallerySlider);
		if (slides.length <= 1) {
			return;
		}

		var activeSlide = 0;
		function renderSlides() {
			slides.forEach(function (slide, index) {
				slide.style.display = index === activeSlide ? 'block' : 'none';
			});
		}

		function createSliderButton(type, imagePath) {
			var button = createEl('button', { type: 'button', className: type + ' slick-btn' });
			button.innerHTML = '<img src="' + imagePath + '" alt="">';
			gallerySlider.appendChild(button);
			return button;
		}

		var prev = createSliderButton('slick-prev', 'images/arrow-left.svg');
		var next = createSliderButton('slick-next', 'images/arrow-right.svg');

		prev.addEventListener('click', function () {
			activeSlide = (activeSlide - 1 + slides.length) % slides.length;
			renderSlides();
		});
		next.addEventListener('click', function () {
			activeSlide = (activeSlide + 1) % slides.length;
			renderSlides();
		});

		renderSlides();
	}

	// Блок 9: мобільне меню (бургер)
	function initMobileMenu() {
		var menuButton = qs('.menu__btn');
		var menuList = qs('.menu__list');
		if (!menuButton || !menuList) {
			return;
		}

		menuButton.addEventListener('click', function () {
			menuList.classList.toggle('menu__list--active');
		});
	}

	// Блок 10: невеликі утиліти для скорочення коду
	function qs(selector, root) {
		return (root || document).querySelector(selector);
	}

	function qsa(selector, root) {
		return Array.from((root || document).querySelectorAll(selector));
	}

	function createEl(tag, options) {
		var node = document.createElement(tag);
		if (!options) {
			return node;
		}

		Object.keys(options).forEach(function (key) {
			node[key] = options[key];
		});

		return node;
	}
});