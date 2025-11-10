#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#  ----------------------------------------IMPORTS & CONFIG GLOBALE----------------------------------------
import os
import time
from datetime import datetime, date

from ics import Calendar
from dateutil import tz

#  FICHIER ICS LOCAL
#  --------------------------------------------------------------------------------------------------------
ADE_ICS_PATH = "icalexport.ics"

#  Timezone locale (Bruxelles)
LOCAL_TZ = tz.gettz("Europe/Brussels")

#  Date de test : si None -> aujourd'hui, sinon on force cette date
#  --------------------------------------------------------------------------------------------------------
# TEST_DATE = date(2025, 11, 10)
TEST_DATE = None

#  Mode debug : log dans des fichiers ce que l'ICS contient
DEBUG_MODE = False


#  ----------------------------------------FONCTIONS UTILITAIRES-------------------------------------------

def clearConsole():
    """This function cleans the terminal window.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    command = "clear"
    if os.name in ("nt", "dos"):
        command = "cls"
    os.system(command)


def title(text: str) -> str:
    """This function returns a simple title string for sections.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    return f"=== {text} ==="


def ok_msg(text: str) -> str:
    """This function returns an OK-style message.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    return f"[OK] {text}"


def ko_msg(text: str) -> str:
    """This function returns an error/KO-style message.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    return f"[X] {text}"


def info_msg(text: str) -> str:
    """This function returns an info-style message.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    return f"[INFO] {text}"


#  ----------------------------------------LOGIQUE ADE / ICS-----------------------------------------------

def fetch_calendar_from_file():
    """This function loads the ADE calendar (ICS) from a local file and returns a Calendar object.

    Return:
    ------
    cal: calendar object from ics library (Calendar)

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    print(info_msg(f"Chargement du fichier ICS local : {ADE_ICS_PATH}"))
    if not os.path.exists(ADE_ICS_PATH):
        print(ko_msg(f"Fichier ICS introuvable : {ADE_ICS_PATH}"))
        raise FileNotFoundError(ADE_ICS_PATH)

    try:
        with open(ADE_ICS_PATH, "r", encoding="utf-8") as f:
            ics_data = f.read()
    except OSError as e:
        print(ko_msg(f"Erreur de lecture du fichier ICS : {e}"))
        raise

    cal = Calendar(ics_data)
    return cal


def debug_print_events_for_date(cal, target_date):
    """This function logs all events for a given date into a text file (for debugging).

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.2 09/11/25)
    """
    filename = f"ade_debug_{target_date.isoformat()}.txt"
    path = os.path.join(os.getcwd(), filename)

    compteur = 0
    lines = []
    lines.append(title(f"DEBUG – ÉVÉNEMENTS POUR LE {target_date.strftime('%d/%m/%Y')}"))
    lines.append("")

    for ev in cal.events:
        if not ev.begin or not ev.end:
            continue

        start = ev.begin.astimezone(LOCAL_TZ)
        end = ev.end.astimezone(LOCAL_TZ)

        if start.date() != target_date:
            continue

        compteur += 1
        lines.append("-" * 80)
        lines.append(f"Event #{compteur}")
        lines.append(f"Début      : {start!r}")
        lines.append(f"Fin        : {end!r}")
        lines.append(f"Location   : {ev.location!r}")
        lines.append(f"Name       : {ev.name!r}")
        lines.append(f"Description: {ev.description!r}")
        lines.append("")

    if compteur == 0:
        lines.append("AUCUN événement trouvé pour cette date dans le fichier ICS.")
    lines.append("-" * 80)

    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(info_msg(f"Fichier debug des événements écrit dans : {path}"))
    except OSError as e:
        print(ko_msg(f"Impossible d'écrire le fichier debug : {e}"))


def get_today_events_for_location(cal, location_query, TARGET_DATE=TEST_DATE):
    """This function filters events for a specific date (today or TARGET_DATE)
    and a specific location (substring).

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.3 09/11/25)
    """
    target_date = TARGET_DATE or date.today()
    location_query = location_query.lower().strip()

    events_today = []

    for ev in cal.events:
        if not ev.begin or not ev.end:
            continue

        start = ev.begin.astimezone(LOCAL_TZ)
        end = ev.end.astimezone(LOCAL_TZ)

        if start.date() != target_date:
            continue

        text = f"{ev.location or ''} {ev.name or ''} {ev.description or ''}".lower()

        if location_query not in text:
            continue

        events_today.append((ev, start, end))

    events_today.sort(key=lambda item: item[1])
    return events_today


def analyse_availability(events_today):
    """This function analyses if the room is busy now and returns some indicators.

    Parameters:
    ----------
    events_today: list of tuples (event, start_datetime, end_datetime)

    Return:
    ------
    tuple: (busy_now_flag, current_event, next_event)
        - busy_now_flag (bool): True si occupé maintenant
        - current_event: tuple (ev, start, end) ou None
        - next_event: tuple (ev, start, end) ou None

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.1 09/11/25)
    """
    now = datetime.now(LOCAL_TZ)

    current_event = None
    next_event = None

    for ev, start, end in events_today:
        if start <= now <= end:
            current_event = (ev, start, end)
            break
        if start > now and next_event is None:
            next_event = (ev, start, end)

    busy_now = current_event is not None
    return busy_now, current_event, next_event


def display_result(events_today, location_query, TARGET_DATE=TEST_DATE):
    """This function displays the availability and the full day schedule.

    Parameters:
    ----------
    events_today: list of tuples (event, start_datetime, end_datetime)
    location_query: text used to search the room (str)

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.2 09/11/25)
    """
    now = datetime.now(LOCAL_TZ)
    target_date = TARGET_DATE or now.date()
    date_str = target_date.strftime("%d/%m/%Y")
    hour_str = now.strftime("%H:%M")

    clearConsole()
    print(title("MINI ASSISTANT ADE – DISPONIBILITÉ D'UN LOCAL"))
    print()
    print(f"Local recherché : {location_query}")
    print(f"Date            : {date_str}")
    print(f"Heure actuelle  : {hour_str}")
    print()

    if not events_today:
        print(ok_msg("Aucun événement prévu aujourd'hui pour ce local."))
        print(ok_msg("Le local est libre toute la journée ✅"))
        return

    busy_now, current_event, next_event = analyse_availability(events_today)

    if busy_now and current_event:
        ev, start, end = current_event
        print(ko_msg("Le local est ACTUELLEMENT OCCUPÉ ❌"))
        print(f"   Cours : {ev.name}")
        print(f"   De    : {start.strftime('%H:%M')} à {end.strftime('%H:%M')}")
    else:
        print(ok_msg("Le local est ACTUELLEMENT LIBRE ✅"))
        if next_event:
            ev, start, end = next_event
            print("   Prochain événement prévu :")
            print(f"   - {ev.name}")
            print(f"   - De {start.strftime('%H:%M')} à {end.strftime('%H:%M')}")
        else:
            print("   Aucun autre événement prévu pour le reste de la journée.")

    print()
    print(title("PLANNING COMPLET DU JOUR POUR CE LOCAL"))
    print()
    for ev, start, end in events_today:
        ligne = f"{start.strftime('%H:%M')} – {end.strftime('%H:%M')}  |  {ev.name or 'Sans titre'}"
        print(ligne)


#  ----------------------------------------FONCTION PRINCIPALE---------------------------------------------

def main():
    """This function is the entry point of the mini ADE assistant.

    It asks the user for a room/location name and prints the availability for TODAY
    or TEST_DATE if defined.

    Version:
    -------
    specification: Esteban BARRACHO (v.1 09/11/25)
    implementation: Esteban BARRACHO (v.2 09/11/25)
    """
    clearConsole()
    print(title("MINI ASSISTANT ADE – UNAMUR"))
    print()
    print("Idée : taper un nom de local, je te dis si c'est libre.")
    if TEST_DATE is None:
        print("Date utilisée : aujourd'hui.")
    else:
        print(f"Date utilisée : {TEST_DATE.strftime('%d/%m/%Y')}.")
    print("Exemples : 'Auditoire', 'local', '147', 'I35', etc.")
    print()

    location_query = input("Quel local tu veux vérifier pour cette date ? : ").strip()

    if not location_query:
        print()
        print(ko_msg("Aucun texte saisi. J'arrête le programme."))
        time.sleep(2)
        return

    print()
    print(info_msg("Chargement du calendrier ADE local…"))
    time.sleep(0.8)

    cal = fetch_calendar_from_file()

    if DEBUG_MODE:
        target = TEST_DATE or date.today()
        debug_print_events_for_date(cal, target)

    events_today = get_today_events_for_location(cal, location_query, TEST_DATE)

    display_result(events_today, location_query, TEST_DATE)


#  ----------------------------------------POINT D'ENTRÉE SCRIPT-------------------------------------------
if __name__ == "__main__":
    main()
