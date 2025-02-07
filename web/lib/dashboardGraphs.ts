import { Dispatch, SetStateAction } from "react";
import { Loading } from "../components/templates/dashboard/dashboardPage";
import { CostOverTime } from "../pages/api/metrics/costOverTime";
import { ErrorOverTime } from "../pages/api/metrics/errorOverTime";
import { FilterNode } from "./api/metrics/filters";
import { ErrorCountOverTime } from "./api/metrics/getErrorOverTime";
import { Metrics } from "./api/metrics/metrics";
import { Result } from "./result";
import {
  RequestsOverTime,
  TimeIncrement,
} from "./timeCalculations/fetchTimeData";

import { getTimeInterval, validTimeWindow } from "./timeCalculations/time";

export const initialGraphDataState: GraphDataState = {
  requestsOverTime: "loading",
  costOverTime: "loading",
  errorOverTime: "loading",
};

export interface GraphDataState {
  requestsOverTime: Loading<Result<RequestsOverTime[], string>>;
  costOverTime: Loading<Result<CostOverTime[], string>>;
  errorOverTime: Loading<Result<ErrorOverTime[], string>>;
}
async function fetchDataOverTime<T>(
  filter: FilterNode,
  dbIncrement: TimeIncrement,
  path: string
) {
  return await fetch(`/api/metrics/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter,
      dbIncrement,
      timeZoneDifference: new Date().getTimezoneOffset(),
    }),
  }).then((res) => res.json() as Promise<Result<T[], string>>);
}

export async function getDashboardData(
  filter: FilterNode,
  setMetrics: (m: Loading<Result<Metrics, string>>) => void,
  setGraphData: Dispatch<SetStateAction<GraphDataState>>
) {
  if (validTimeWindow(filter)) {
    setMetrics("loading");
    setGraphData(initialGraphDataState);
    const timeInterval = getTimeInterval(filter);
    fetchDataOverTime<RequestsOverTime>(
      filter,
      timeInterval,
      "requestOverTime"
    ).then(({ data, error }) => {
      if (error !== null) {
        console.error(error);
        setGraphData((prev) => ({
          ...prev,
          requestsOverTime: { error, data: null },
        }));
      } else {
        setGraphData((prev) => ({
          ...prev,
          requestsOverTime: {
            data: data.map((d) => ({
              count: +d.count,
              time: new Date(d.time),
            })),
            error,
          },
        }));
      }
    });

    fetchDataOverTime<CostOverTime>(filter, timeInterval, "costOverTime").then(
      ({ data, error }) => {
        if (error !== null) {
          console.error(error);
          setGraphData((prev) => ({
            ...prev,
            costOverTime: { error, data: null },
          }));
        } else {
          setGraphData((prev) => ({
            ...prev,
            costOverTime: {
              data: data.map((d) => ({
                cost: +d.cost,
                time: new Date(d.time),
              })),
              error,
            },
          }));
        }
      }
    );

    fetchDataOverTime<ErrorOverTime>(
      filter,
      timeInterval,
      "errorOverTime"
    ).then(({ data, error }) => {
      if (error !== null) {
        console.error(error);
        setGraphData((prev) => ({
          ...prev,
          costOverTime: { error, data: null },
        }));
      } else {
        setGraphData((prev) => ({
          ...prev,
          errorOverTime: {
            data: data.map((d) => ({
              count: +d.count,
              time: new Date(d.time),
            })),
            error,
          },
        }));
      }
    });

    fetch("/api/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filter),
    })
      .then((res) => res.json() as Promise<Result<Metrics, string>>)
      .then(({ data, error }) => {
        if (error !== null) {
          console.error(error);
          setMetrics({ error, data: null });
        } else {
          setMetrics({
            data: {
              ...data,
              last_request: new Date(data.last_request),
              first_request: new Date(data.first_request),
            },
            error: null,
          });
        }
      });
  }
}
