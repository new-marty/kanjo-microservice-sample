package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// GoalHandler handles goal-related requests.
type GoalHandler struct {
	svc *service.GoalService
}

// NewGoalHandler creates a new GoalHandler.
func NewGoalHandler(svc *service.GoalService) *GoalHandler {
	return &GoalHandler{svc: svc}
}

// ListGoals returns savings goals.
//
//	@ID			listGoals
//	@Summary	List goals
//	@Tags		goals
//	@Produce	json
//	@Success	200	{object}	DataWrapper{data=[]SavingsGoalResponse}
//	@Router		/api/v1/goals [get]
func (h *GoalHandler) ListGoals(c *gin.Context) {
	goals, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(goals, toSavingsGoalResponse)})
}

// CreateGoal creates a new savings goal.
//
//	@ID			createGoal
//	@Summary	Create goal
//	@Tags		goals
//	@Accept		json
//	@Produce	json
//	@Param		body	body		CreateGoalRequest	true	"Goal data"
//	@Success	201		{object}	SavingsGoalResponse
//	@Router		/api/v1/goals [post]
func (h *GoalHandler) CreateGoal(c *gin.Context) {
	var input CreateGoalRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcInput := service.CreateInput{
		Name:         input.Name,
		TargetAmount: input.TargetAmount,
	}

	if input.CurrentAmount != nil {
		svcInput.CurrentAmount = *input.CurrentAmount
	}
	if input.Deadline != nil {
		if t, err := time.Parse("2006-01-02", *input.Deadline); err == nil {
			svcInput.Deadline = &t
		}
	}
	if input.Icon != nil {
		svcInput.Icon = *input.Icon
	}
	if input.Color != nil {
		svcInput.Color = *input.Color
	}

	goal, err := h.svc.Create(c.Request.Context(), svcInput)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toSavingsGoalResponse(goal))
}

// UpdateGoal updates a savings goal.
//
//	@ID			updateGoal
//	@Summary	Update goal
//	@Tags		goals
//	@Accept		json
//	@Produce	json
//	@Param		id		path		int					true	"Goal ID"
//	@Param		body	body		UpdateGoalRequest	true	"Goal data"
//	@Success	200		{object}	StatusResponse
//	@Router		/api/v1/goals/{id} [put]
func (h *GoalHandler) UpdateGoal(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var input UpdateGoalRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcInput := service.UpdateInput{
		Name:          input.Name,
		TargetAmount:  input.TargetAmount,
		CurrentAmount: input.CurrentAmount,
		Icon:          input.Icon,
		Color:         input.Color,
		Archived:      input.Archived,
	}

	if input.Deadline != nil {
		if t, err := time.Parse("2006-01-02", *input.Deadline); err == nil {
			svcInput.Deadline = &t
		}
	}

	err = h.svc.Update(c.Request.Context(), id, svcInput)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}

// DeleteGoal deletes a savings goal.
//
//	@ID			deleteGoal
//	@Summary	Delete goal
//	@Tags		goals
//	@Param		id	path	int	true	"Goal ID"
//	@Success	204
//	@Router		/api/v1/goals/{id} [delete]
func (h *GoalHandler) DeleteGoal(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = h.svc.Delete(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
