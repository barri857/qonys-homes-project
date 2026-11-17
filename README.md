# Qonys Homes

A real estate website for browsing apartments in Astana, built as a four-person web development final project.

## Features

- Search and filter apartments by district, room count and budget.
- Sort listings by price or area.
- View building covers, apartment photos and listing details.
- Save favorites and compare up to three properties.
- Switch between English, Russian and Kazakh.
- Switch between light and dark themes.
- Estimate monthly mortgage payments.
- Use validated contact and viewing request forms.
- Browse on desktop and mobile screens.

Favorites, comparison choices, language and theme preferences are saved in the browser.

## Run locally

1. Download or clone this repository.
2. Open the project folder in Visual Studio Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

Use a local web server so the browser can load `properties.json` and `translations.json`. No build step or package installation is required.

## Project files

| File or folder | Purpose |
| --- | --- |
| `index.html` | Home page |
| `properties.html` | Property catalog, filters and comparison |
| `saved.html` | Saved properties |
| `about.html` | Project and team information |
| `contact.html` | Contact form |
| `style.css` | Styling, themes and responsive layout |
| `script.js` | Page behavior and jQuery event handlers |
| `properties.json` | Apartment details, prices and listing links |
| `translations.json` | English, Russian and Kazakh text |
| `images/` | Building covers and apartment gallery images |
| `vendor/` | Local Bootstrap CSS, jQuery and their licenses |

## Technologies

HTML, CSS, Bootstrap, JavaScript, jQuery and JSON. The project runs entirely in the browser.

## Team

- **Temirgaliyev Nurassyl — project lead**
- Salamat Toremuratov
- Damir Dyussenbay
- Akzhigit Agabekov

## Property data and demo forms

The 12 apartment records contain stored Krisha asking-price snapshots. They are not a live feed; use the original listing links to check current prices and availability. Building covers illustrate the residential complexes, while the detail galleries show the individual apartments.

Contact and viewing forms are classroom demonstrations. They save requests in the current browser and do not send them to a real estate agent.

Bootstrap and jQuery license information is included in `vendor/LICENSES.txt`.
