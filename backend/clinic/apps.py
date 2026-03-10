import os
from django.apps import AppConfig


class ClinicConfig(AppConfig):
    name = 'clinic'

    def ready(self):
        # In Django's auto-reloader, the main process spawns a child with RUN_MAIN=true.
        # We only want to start the scheduler in the child process (the actual server).
        run_main = os.environ.get('RUN_MAIN')
        
        # When using runserver with reloader: start only in the child process
        # When using runserver --noreload or other servers: RUN_MAIN won't be set, start anyway
        if run_main == 'true' or run_main is None:
            from clinic.reminder_scheduler import start_reminder_scheduler
            start_reminder_scheduler()
