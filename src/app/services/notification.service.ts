import { Injectable } from "@angular/core";
import { LocalNotifications, ScheduleResult } from "@capacitor/local-notifications";
import { EMPTY, Observable, from, map, switchMap } from "rxjs";

@Injectable()
export class NotificationService {
  private get id(): number {
    return this._id++;
  }

  private _id: number = 0;

  constructor() {
    from(LocalNotifications.checkPermissions())
      .pipe(
        switchMap((permission) => {
          if (permission.display !== 'granted') {
            return from(LocalNotifications.requestPermissions())
          }

          return EMPTY;
        })
      )
      .subscribe();

  }

  public schedule(title: string, body: string, at: Date): Observable<ScheduleResult> {
    return from(
      LocalNotifications.schedule({
        notifications: [{
          title: title,
          body: body,
          id: this.id,
          schedule: {
            at: at,
          }
        }],
      })
    );
  }

  public getPendingIds(): Observable<number[]> {
    return from(
      LocalNotifications.getPending()
    )
      .pipe(
        map((pending) => pending.notifications.map((notification) => notification.id))
      );
  }

  public cancel(ids: number[]): Observable<void> {
    return from(LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id }))
    }));
  }
}
