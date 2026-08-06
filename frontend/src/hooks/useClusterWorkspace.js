import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Extracted from pages/ClusterWorkspace.jsx — no behavior changes.
// Owns data fetching, edit/modal state, and mutation handlers for the
// cluster workspace page.
export function useClusterWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [actionError, setActionError] = useState("");

  const { data: clusterData, isLoading } = useQuery({
    queryKey: ["cluster", id],
    queryFn: () => api.getCluster(id),
  });

  const { data: mockTestsData } = useQuery({
    queryKey: ["mock-tests", id],
    queryFn: () => api.listMockTests(id),
    enabled: Boolean(id),
  });

  const cluster = clusterData?.cluster;
  const mocktests = mockTestsData?.mockTests || [];

  const processingCount = mocktests.filter(
    (mocktest) => mocktest.status === "processing",
  ).length;
  const readyCount = mocktests.filter(
    (mocktest) => mocktest.status === "published",
  ).length;
  const reviewCount = mocktests.filter(
    (mocktest) => mocktest.status === "review",
  ).length;

  const handleDeleteCluster = async () => {
    try {
      await api.deleteCluster(cluster.id);
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      navigate("/clusters");
    } catch (error) {
      setActionError(error.message || "Could not delete cluster");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateCluster(cluster.id, {
        name: editForm.name,
        description: editForm.description,
      });
      await queryClient.invalidateQueries({ queryKey: ["cluster", id] });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      setEditing(false);
      setActionError("");
    } catch (error) {
      setActionError(error.message || "Could not update cluster");
    }
  };

  const startEdit = () => {
    setEditForm({
      name: cluster.name,
      description: cluster.description || "",
    });
    setEditing(true);
  };

  return {
    id,
    cluster,
    mocktests,
    isLoading,
    actionError,
    showModal,
    setShowModal,
    editing,
    setEditing,
    editForm,
    setEditForm,
    stats: { processingCount, readyCount, reviewCount },
    handleDeleteCluster,
    handleSaveEdit,
    startEdit,
  };
}
