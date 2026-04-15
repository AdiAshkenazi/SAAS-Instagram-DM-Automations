"use client";

import { deleteAutomation } from "@/actions/automation";
import { Button } from "@/components/ui/button";
import { useMutationData, useMutationDataState } from "@/hooks/use-mutation-data";
import { usePath } from "@/hooks/user-nav";
import { useQueryAutomation } from "@/hooks/user-queries";
import { cn, getMonth } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import CreateAutomation from "../create-automation";
import GradientButton from "../gradient-button";

type Props = {};

function AutomationList({}: Props) {
  const { data } = useQueryAutomation();

  const { latestVariable } = useMutationDataState(["create-automation"]);
  // console.log("🚀 ~ AutomationList ~ latestVariables:", latestVariables);

  const { pathname } = usePath();

  const optimisticUiData = useMemo(() => {
    if (latestVariable && latestVariable?.variables && data) {
      const newData = [latestVariable.variables, ...data.data];
      return { data: newData };
    }
    return data || { data: [] };
  }, [latestVariable, data]);

  if (data?.status !== 200 || data?.data.length <= 0) {
    return (
      <div className="h-[70vh] flex justify-center items-center flex-col gap-y-3">
        <h3 className="text-lg text-gray-400">No Automation</h3>
        <CreateAutomation />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-3">
      {optimisticUiData.data!.map((automation) => (
        <div
          key={automation.id}
          className="relative bg-[#1D1D1D] rounded-xl border-[1px] radial--gradient--automations border-[#545454]"
        >
        <Link
          href={`${pathname}/${automation.id}`}
          className="hover:opacity-80 transition duration-100 p-5 flex"
        >
          <div className="flex flex-col flex-1 items-start">
            <h2 className="text-xl font-semibold">{automation.name}</h2>
            <p className="text-[#9B9CA0] text-sm font-light mb-2">
              This is from comment
            </p>

            {automation.keywords.length > 0 ? (
              <div className="flex gap-x-2 flex-wrap mt-3">
                {
                  // @ts-ignore
                  automation.keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-full px-4 py-1 capitalize",
                        (0 + 1) % 1 == 0 &&
                          "bg-keyword-green/15 border-2 border-keyword-green",
                        (1 + 1) % 2 == 0 &&
                          "bg-keyword-purple/15 border-2 border-keyword-purple",
                        (2 + 1) % 3 == 0 &&
                          "bg-keyword-yellow/15 border-2 border-keyword-yellow",
                        (3 + 1) % 4 == 0 &&
                          "bg-keyword-red/15 border-2 border-keyword-red"
                      )}
                    >
                      {keyword.word}
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="rounded-full border-2 mt-3 border-dashed border-white/60 px-3 py-1">
                <p className="text-sm text-[#bfc0c3]">No Keywords</p>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between pr-8">
            <p className="capitalize text-sm font-light text-[#9B9CA0]">
              {getMonth(automation.createdAt.getUTCMonth() + 1)}{" "}
              {automation.createdAt.getUTCDate() === 1
                ? `${automation.createdAt.getUTCDate()}st`
                : `${automation.createdAt.getUTCDate()}th`}{" "}
              {automation.createdAt.getUTCFullYear()}
            </p>

            {automation.listener?.listener === "SMARTAI" ? (
              <GradientButton
                type="BUTTON"
                className="w-full bg-background-80 text-white hover:bg-background-80"
              >
                Smart AI
              </GradientButton>
            ) : (
              <Button className="bg-background-80 hover:bg-background-80 text-white">
                Standard
              </Button>
            )}
          </div>
        </Link>
        <DeleteAutomationButton id={automation.id} />
        </div>
      ))}
    </div>
  );
}

function DeleteAutomationButton({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    queryClient.setQueryData(["user-automation"], (old: any) => {
      if (!old) return old;
      return { ...old, data: old.data.filter((a: any) => a.id !== id) };
    });
    await deleteAutomation(id);
  };

  return (
    <button
      onClick={handleDelete}
      className="absolute top-3 right-3 p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition"
    >
      <Trash2 size={16} />
    </button>
  );
}

export default AutomationList;
