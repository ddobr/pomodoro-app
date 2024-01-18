import { CurrentStage } from "./current-stage.type";
import { SprintNumber } from "./sprint-number.type";

export type TimingInfo = {
  /** seconds to stage end. if negative then the stage is overdone */
  deltaSeconds: number,
  stage: CurrentStage,
  sprint: SprintNumber,
};
