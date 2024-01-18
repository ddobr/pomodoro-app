import { BehaviorSubject, Observable, Subject, filter, interval, map, share, takeUntil, tap } from "rxjs";
import { PomodoroSettings } from "../types/pomodoro-settings.type";
import { Injectable, OnDestroy, inject } from "@angular/core";
import { POMODORO_SETTINGS } from "../tokens/pomodoro-settings.token";
import { TimerStatus } from "../types/timer-status.type";
import { TimingInfo } from "../types/timing-info.type";
import { CurrentStage } from "../types/current-stage.type";
import { SprintNumber } from "../types/sprint-number.type";

/**
 * Pomodoro loop consists of 4 sprints
 *
 *
 * First three sprint includes:
 * Task for a period of task time
 * then
 * Break for a period of break time
 *
 *
 * Final forth sprint includes:
 * Task for a period of task time
 * then
 * Long break for a period of task time + break time
 *
 *
 * After finishing forth sprint loop repeats
 */
@Injectable()
export class PomodoroTimerService implements OnDestroy {

  public get status(): TimerStatus {
    return this._status$.getValue();
  }

  public get timingInfo(): TimingInfo {
    return {
      deltaSeconds: this.deltaSeconds,
      stage: this._stage,
      sprint: this._sprint,
    }
  }

  public get deltaSeconds(): number {
    const pausedTimeMs = this.status === 'paused' ? Date.now() - this._pauseStartTimestamp : 0;
    const msRemaining  = this._stageEndTimestamp - Date.now();
    const includingPause = msRemaining + pausedTimeMs;

    return Math.round(includingPause / 1000);
  }

  /** Emits value of remaining stage */
  public readonly timingInfo$: Observable<TimingInfo>;
  public readonly status$: Observable<TimerStatus>;


  public readonly newStage$: Observable<TimingInfo>;
  public readonly newSprint$: Observable<TimingInfo>;
  public readonly loopFinished$: Observable<TimingInfo>;


  protected readonly settings$: BehaviorSubject<PomodoroSettings> = inject(POMODORO_SETTINGS);
  protected readonly destroy$: Subject<void> = new Subject<void>();


  private readonly _status$: BehaviorSubject<TimerStatus> = new BehaviorSubject<TimerStatus>('ready');
  private readonly _newStage$: Subject<TimingInfo> = new Subject<TimingInfo>();
  private readonly _newSprint$: Subject<TimingInfo> = new Subject<TimingInfo>();
  private readonly _loopFinished$: Subject<TimingInfo> = new Subject<TimingInfo>();


  private _appliedSettings: PomodoroSettings = this.settings$.value;
  private _stageEndTimestamp: number = 0;
  private _stage: CurrentStage = 'task';
  /**
   * ```md
   * |0          |1          |2          |3
   * |task, break|task, break|task, break|task, long break (task + break time)
   * ```
   */
  private _sprint: SprintNumber = 0;

  private _interval: Observable<unknown> = interval(250).pipe(share());
  private _pauseStartTimestamp: number = 0;


  constructor() {
    this.status$ = this._status$.asObservable();

    this.newStage$ = this._newStage$.asObservable();
    this.newSprint$ = this._newSprint$.asObservable();
    this.loopFinished$ = this._loopFinished$.asObservable();


    this.timingInfo$ = this.createTimingInfoSource();

    this.watchForSettings();
  }



  public start(): void {
    if (this.status !== 'ready') {
      return;
    }

    this._stageEndTimestamp = Date.now() + this._appliedSettings.taskTimeMinutes * 60 * 1000;
    this._pauseStartTimestamp = 0;
    this._sprint = 0;
    this._status$.next('running');
  }

  public pause(): void {
    if (this.status !== 'running') {
      return;
    }

    this._pauseStartTimestamp = Date.now();
    this._status$.next('paused');
  }

  public continue(): void {
    if (this.status !== 'paused') {
      return;
    }

    const pausedTimeMs = Date.now() - this._pauseStartTimestamp;
    this._pauseStartTimestamp = 0;
    this._stageEndTimestamp += pausedTimeMs;
    this._status$.next('running');
  }

  public stop(): void {
    if (this.status === 'ready') {
      return;
    }

    this._stageEndTimestamp = Date.now() + this._appliedSettings.taskTimeMinutes * 60 * 1000;
    this._pauseStartTimestamp = Date.now();
    this._sprint = 0;
    this._status$.next('ready');
  }

  public nextStage(): void {
    const finishedStageTimingInfo = this.timingInfo;

    if (this.status === 'ready' || finishedStageTimingInfo.deltaSeconds > 0) {
      return;
    }

    this._newStage$.next(finishedStageTimingInfo);

    if (this._stage === 'break') {
      this._stageEndTimestamp = Date.now() + this._appliedSettings.taskTimeMinutes * 60 * 1000;
      this._sprint = (this._sprint + 1) % 4 as SprintNumber;
      this._stage = 'task';

      this._newSprint$.next(finishedStageTimingInfo);
      if (this._sprint === 0) {
        this._loopFinished$.next(finishedStageTimingInfo);
      }
    } else {
      this._stageEndTimestamp = Date.now() + this._appliedSettings.breakTimeMinutes * 60 * 1000;
      if (this._sprint === 3) {
        this._stageEndTimestamp += this._appliedSettings.taskTimeMinutes * 60 * 1000;
      }
      this._stage = 'break';
    }
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
  }

  protected setupTimer(settings: PomodoroSettings): void {
    this.stop();
    this._appliedSettings = settings;
    this._stageEndTimestamp = Date.now() + this._appliedSettings.taskTimeMinutes * 60 * 1000;
    this._pauseStartTimestamp = Date.now();
  }

  private watchForSettings(): void {
    this.settings$
      .pipe(
        tap((settings) => this.setupTimer(settings)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private createTimingInfoSource(): Observable<TimingInfo> {
    return this._interval
      .pipe(
        filter(() => this.status === 'running'),
        map(() => this.timingInfo),
      );
  }
}
