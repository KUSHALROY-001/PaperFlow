import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function WorkspaceBreadcrumbs({
  clusterId,
  clusterName,
  currentMockTestId,
  clusterMockTests = [],
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
      <Link
        to={`/cluster/${clusterId}`}
        className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-orange-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {clusterName || "Cluster"}
      </Link>

      {clusterMockTests.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {clusterMockTests.map((item, index) => {
              const isActive = item.id === currentMockTestId;

              return (
                <Fragment key={item.id}>
                  {index > 0 && <div className="h-5 w-px bg-border" />}
                  <Link
                    to={`/cluster/${clusterId}/mocktest/${item.id}`}
                    className={
                      isActive
                        ? "text-sm font-semibold text-orange-500"
                        : "text-sm font-medium text-muted-foreground hover:text-orange-500 transition-colors"
                    }
                  >
                    {item.name}
                  </Link>
                </Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
